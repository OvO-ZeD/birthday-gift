-- Optional YouTube soundtrack link for each gift.
-- The video remains hosted and played by YouTube; no audio is downloaded or re-hosted.
alter table public.gifts
  add column if not exists youtube_video_id text;
