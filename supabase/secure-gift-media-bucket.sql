-- Keep uploaded photos, videos, and audio out of the public storage surface.
-- The app serves recipient media through its access-checked API and uses signed URLs
-- for authenticated Studio previews.
-- Apply in Supabase Dashboard -> SQL Editor; safe to run more than once.

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'gift-media'
  ) then
    raise exception 'The gift-media storage bucket does not exist.';
  end if;
end;
$$;

update storage.buckets
set public = false
where id = 'gift-media';

select id, public
from storage.buckets
where id = 'gift-media';
