-- ============================================================================================
-- Postcard & Reveal experience
-- ============================================================================================
-- Additive only. No DROP, no column removal, no data rewrite. Every column added is nullable
-- or defaulted so existing rows keep working, and existing gifts continue to behave exactly as
-- they do today: the whole feature is inert unless experience_enabled is true.
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- ============================================================================================

-- --------------------------------------------------------------------------------------------
-- 1. Per-gift experience settings
-- --------------------------------------------------------------------------------------------

alter table public.gifts
  -- Master switch. Existing rows default to false, so no published gift is affected.
  add column if not exists experience_enabled boolean not null default false,
  -- Which of the four combinations the sender chose.
  add column if not exists countdown_enabled boolean not null default false,
  -- Nullable: a gift may have a password and no countdown, or a countdown and no password.
  add column if not exists reveal_at timestamptz,
  -- The postcard that goes out by email.
  add column if not exists postcard_subject text,
  add column if not exists postcard_note text,
  -- Bumped whenever the reveal conditions change (new deadline, new password, revocation), so
  -- any access cookie issued under the old conditions stops matching. This is what prevents a
  -- stale password cookie from walking past a countdown that was added afterwards.
  add column if not exists access_version integer not null default 1;

comment on column public.gifts.access_version is
  'Incremented to invalidate outstanding access cookies. Cookies are signed over this value.';

-- Anything that changes the reveal conditions must invalidate existing access.
create or replace function public.bump_gift_access_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.access_version is not distinct from old.access_version then
    if new.reveal_at is distinct from old.reveal_at
       or new.password_enabled is distinct from old.password_enabled
       or new.password_hash is distinct from old.password_hash
       or new.countdown_enabled is distinct from old.countdown_enabled
       or new.experience_enabled is distinct from old.experience_enabled
       or new.published is distinct from old.published
    then
      new.access_version := old.access_version + 1;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gifts_bump_access_version on public.gifts;
create trigger gifts_bump_access_version
  before update on public.gifts
  for each row
  execute function public.bump_gift_access_version();

-- --------------------------------------------------------------------------------------------
-- 2. Invitations
-- --------------------------------------------------------------------------------------------
-- Only the hash of the token is stored. The raw token exists only in the email that carries
-- it, so a database leak cannot be replayed into access.

create table if not exists public.gift_invitations (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  -- sha256 hex of the raw token. Unique so a collision cannot grant two invitations at once.
  token_hash text not null unique,
  -- A short non-secret prefix, for showing the sender which invitation is which.
  token_prefix text not null,
  -- Null means the invitation never expires.
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  use_count integer not null default 0,
  -- Delivery record. The provider response is stored verbatim so the dashboard can show what
  -- actually happened rather than a guess.
  email_provider text,
  email_provider_id text,
  email_status text not null default 'pending',
  email_error text,
  email_sent_at timestamptz
);

comment on table public.gift_invitations is
  'One row per recipient invite. Stores token hashes only; raw tokens live only in the email.';

create index if not exists gift_invitations_gift_id_idx on public.gift_invitations (gift_id);
create index if not exists gift_invitations_expires_at_idx on public.gift_invitations (expires_at);

-- An address may only hold one live invitation per gift. Revoked rows are kept for the record
-- and are excluded, so re-inviting after a revocation is allowed.
create unique index if not exists gift_invitations_live_email_idx
  on public.gift_invitations (gift_id, lower(recipient_email))
  where revoked_at is null;

-- --------------------------------------------------------------------------------------------
-- 3. Rate limiting
-- --------------------------------------------------------------------------------------------
-- Failed unlock attempts are counted per (bucket, key). The bucket namespaces the purpose so
-- one limiter cannot be exhausted to lock out another.

create table if not exists public.rate_limit_counters (
  bucket text not null,
  key text not null,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  primary key (bucket, key)
);

comment on table public.rate_limit_counters is
  'Sliding-window attempt counters for sensitive endpoints. Service-role access only.';

-- No policies on purpose: row level security with no policy denies everything except the
-- service role, which is the only caller that should ever touch these tables.
alter table public.rate_limit_counters enable row level security;
alter table public.gift_invitations enable row level security;

-- Recording an attempt and reading the verdict must be a single atomic step, otherwise
-- concurrent guesses can each read a stale count. SECURITY DEFINER so it can run with the
-- caller's identity but the definer's rights, and locked to service_role below.
create or replace function public.bump_rate_limit(
  p_bucket text,
  p_key text,
  p_limit integer,
  p_window_seconds integer,
  p_lock_seconds integer
)
returns table (allowed boolean, attempt_count integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limit_counters;
begin
  insert into public.rate_limit_counters (bucket, key)
  values (p_bucket, p_key)
  on conflict (bucket, key) do nothing;

  -- Serialise concurrent callers on this counter.
  select * into v_row
  from public.rate_limit_counters
  where bucket = p_bucket and key = p_key
  for update;

  -- Start of a fresh window once the previous one has elapsed.
  if v_row.window_started_at < now() - make_interval(secs => p_window_seconds) then
    update public.rate_limit_counters
    set attempts = 1,
        window_started_at = now(),
        locked_until = null
    where bucket = p_bucket and key = p_key
    returning * into v_row;

    return query select true, v_row.attempts, v_row.locked_until;
    return;
  end if;

  -- Already locked: report the existing lock without extending it.
  if v_row.locked_until is not null and v_row.locked_until > now() then
    return query select false, v_row.attempts, v_row.locked_until;
    return;
  end if;

  update public.rate_limit_counters
  set attempts = v_row.attempts + 1,
      locked_until = case
        when v_row.attempts + 1 >= p_limit then now() + make_interval(secs => p_lock_seconds)
        else null
      end
  where bucket = p_bucket and key = p_key
  returning * into v_row;

  return query select (v_row.locked_until is null), v_row.attempts, v_row.locked_until;
end;
$$;

revoke all on function public.bump_rate_limit(text, text, integer, integer, integer) from public;
revoke all on function public.bump_rate_limit(text, text, integer, integer, integer) from anon;
revoke all on function public.bump_rate_limit(text, text, integer, integer, integer) from authenticated;
grant execute on function public.bump_rate_limit(text, text, integer, integer, integer) to service_role;

-- --------------------------------------------------------------------------------------------
-- 4. Revoke the anonymous surface
-- --------------------------------------------------------------------------------------------
-- The invitation table holds recipient email addresses. It must never be readable with the
-- publishable key, and with RLS on and no policy that is already the case — these grants make
-- it explicit rather than implied.

revoke all on table public.gift_invitations from anon, authenticated;
revoke all on table public.rate_limit_counters from anon, authenticated;
grant all on table public.gift_invitations to service_role;
grant all on table public.rate_limit_counters to service_role;
