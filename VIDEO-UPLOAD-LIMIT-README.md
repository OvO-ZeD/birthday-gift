# Increasing Afterglow video upload size

The studio now accepts video files up to **500 MB** at the client-side validation layer and gives a more useful error when Supabase rejects a file for exceeding its configured maximum.

**Important:** changing the app limit does not change Supabase Storage's limit. In the Supabase Dashboard, open **Storage → gift-media → bucket settings** and increase the file size limit to a value supported by your project plan. Alternatively, run `supabase/increase-gift-media-size-limit.sql` in the SQL Editor if your plan supports 500 MB. If the plan's maximum is lower, use the highest supported value instead. Supabase plan-level limits cannot be overridden by app code or SQL.

After changing the bucket setting, retry the video upload. Large videos use more bandwidth and may take longer on mobile networks. This update does not transcode/compress videos or implement resumable uploads.
