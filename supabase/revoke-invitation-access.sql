-- Apply in Supabase SQL Editor on projects where gift-experience.sql is already installed.
-- Revoking an invitation invalidates all existing access cookies for that gift in the same
-- transaction. Other live invitations remain usable and can be redeemed for the new version.

create or replace function public.bump_access_version_on_invitation_revocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gifts
  set access_version = access_version + 1
  where id = new.gift_id;

  return new;
end;
$$;

revoke all on function public.bump_access_version_on_invitation_revocation() from public, anon, authenticated;

drop trigger if exists gift_invitations_bump_access_version on public.gift_invitations;
create trigger gift_invitations_bump_access_version
  after update of revoked_at on public.gift_invitations
  for each row
  when (old.revoked_at is null and new.revoked_at is not null)
  execute function public.bump_access_version_on_invitation_revocation();
