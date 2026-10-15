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

## Verification note
A production build could not be run in the generation environment because the Next.js executable was unavailable in `node_modules`. Run `npm ci` and `npm run build` locally before pushing. Test on a real iPhone with a mix of images, MOV/MP4 videos, and one soundtrack, keeping the page open until the progress panel disappears and the save confirmation appears.
