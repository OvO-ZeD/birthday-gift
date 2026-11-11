# Mobile upload reliability update

This update focuses on the iPhone/Safari studio workflow when selecting a batch of photos, videos, and soundtrack audio.

## Changes
- Video cards no longer pre-load video metadata for every selected clip. They use `preload="none"` and `playsInline` to reduce background media work on mobile.
- Image cards use lazy loading and asynchronous decoding to reduce the initial decode burst for large batches.
- Added a visible upload progress panel while saving, including the current file and batch count.
- Successful uploads are checkpointed into React state immediately. If a later upload fails or the browser interrupts the operation, retrying Save Draft should reuse already-uploaded media rather than upload duplicate copies.
- Signed preview URLs are checked before releasing their local object URLs.
- Save and publish actions are guarded against overlapping operations.
- Added a fixed mobile action bar for Save Draft and Preview / Share, with iPhone safe-area spacing.
- Audio remains part of the media save loop and is available on the recipient page through an explicit audio control; it does not autoplay on iOS.
- Videos up to the configured 500 MB application ceiling use 6 MB resumable TUS chunks, retry interrupted chunks, and expose byte-level progress. Supabase plan and private bucket limits must be configured to support the selected file size.
- Recipient video playback now uses an access-checked short-lived signed URL redirect instead of buffering the full object in a Next.js route, allowing the browser to request byte ranges for seeking.

## Verification note
Test on a real iPhone with a mix of images, MOV/MP4 videos, and one soundtrack, keeping the page open until the progress panel disappears and the save confirmation appears. For large videos, also test interrupted-upload retry, playback seeking, and the configured Supabase bucket limit.
