# Increasing Afterglow video upload size

The studio accepts video files up to **500 MB** and uses resumable uploads for larger files. This is only the app-side ceiling; Supabase Storage must also be configured to accept that object size.

Before uploading larger videos:

1. Confirm your Supabase plan supports the desired per-file size.
2. In **Storage → gift-media → bucket settings**, set the file-size limit to the supported value. The optional `supabase/increase-gift-media-size-limit.sql` sets it to 500 MB only when the plan supports that size.
3. Keep the bucket private. The recipient media route checks the gift's access gate and then redirects to a short-lived signed URL so video playback can seek without loading the entire object into the Next.js server.

If the plan supports less than 500 MB, configure its maximum and adjust `MAX_VIDEO_BYTES` in `app/lib/gifts/media-limits.ts` to match. The application cannot bypass a lower provider limit. Images remain subject to the existing client-side 25 MB limit and audio remains limited to 30 MB.

Uploads over 6 MB use Supabase's resumable TUS endpoint and show per-file progress. A large upload can still use substantial bandwidth and may take time on mobile networks. The application does not transcode video.
