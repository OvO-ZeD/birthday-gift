# Afterglow update — what changed and how to apply it

Paste the contents of this zip over your repo (same folder layout), then:

    npm ci
    npm run build
    npm run dev      # check it locally
    git add -A && git commit -m "Merge sign-in into studio, easier soundtracks, sound effects, studio looks, keep-alive" && git push

Vercel deploys on push to main. Nothing here was build-tested by the author (no network was
available), so please run `npm run build` first and read any error it prints.

## New files
- `app/api/keepalive/route.ts` + `vercel.json` — daily Supabase keep-alive (Vercel Cron, 06:00 UTC).
  Optional: add a `CRON_SECRET` env var in Vercel to lock the route.
- `app/template.tsx` — soft fade between pages (skipped for "reduce motion").
- `app/lib/sfx.ts`, `app/components/SoundFx.tsx` — synthesised interface sounds + a mute switch
  (bottom-right). No audio files. Silent on recipient pages (/g/...).
- `app/lib/songs.ts`, `app/studio/SongPicker.tsx` — built-in tunes (Happy Birthday music box,
  Soft lullaby, Sparkle) with preview, and a "Record a voice note or hum" button. Picked songs
  go through your existing soundtrack upload, so no database change is needed.
- `app/studio/StudioLook.tsx`, `app/studio/studio-extras.css` — five studio colour looks.
- `app/components/AuthCard.tsx`, `auth-extras.css` — one sign-in card: password or "email me a link",
  show/hide password, plainer error messages.
- `app/polish.css` — press feedback, keyboard focus ring, smooth scroll.

## Edited files
- `app/studio/layout.tsx` — signed-out visitors see the sign-in card on /studio (no redirect).
- `app/login/page.tsx` — /login now uses the same sign-in card as /studio (`app/login/layout.tsx` is back to the original).
- `app/layout.tsx` — loads polish.css and <SoundFx />.
- `app/page.tsx` — both "Log in" links now point to /studio.
- `next.config.ts` — Permissions-Policy allows the microphone for this site (needed for recording).
- `app/studio/page.tsx` — three one-line additions (so you can apply them by hand if your copy differs):
  1. after `import "./studio.css";` add
     `import SongPicker from "./SongPicker";` and `import StudioLook from "./StudioLook";`
  2. inside `<div className="studio-top-actions">`, before the `draft-status` span, add `<StudioLook />`
  3. right after the `upload-actions` div (the one with "Add soundtrack"), add
     `<SongPicker onPick={(file) => void addFiles([file])} />`

## Not done (needs a database change, so left for later)
- "Paste a Spotify / YouTube link" as a soundtrack: needs a new column on `gifts` plus changes to
  the publish route and the recipient page.
- Moving storage off Supabase. The keep-alive covers the pausing problem for free.

## Also check in Vercel
Project settings -> Deployment Protection: make sure the production `.vercel.app` link is not
behind Vercel login, or recipients will be blocked.

---

# Update 2 — photo viewer, fonts and warmer theme

## Why the photo pop-up glitched
The old pop-up was drawn inside each photo tile. The tile lifts on hover with a CSS transform, and a
transformed parent traps `position: fixed` children, so the "full-screen" view was stuck to the tile and
flickered as the mouse moved. The new viewer is drawn in `<body>` and has no mouse-move effects.

## New / changed
- `app/g/[slug]/PhotoViewer.tsx`, `viewer.css`, `viewer-events.ts` — full-screen viewer: fills the phone
  screen, sits in a sized window on desktop, photo always fits. Tap the photo (or "Read the message")
  to turn it over to the caption. Swipe sideways for next/previous, swipe down to close, arrow keys on
  desktop. The gift soundtrack starts when a photo is opened, with a play/pause button.
- `app/g/[slug]/MemoryCard.tsx` — tiles now just open the viewer.
- `app/g/[slug]/page.tsx` — mounts the viewer once and passes it the photos and the soundtrack.
- `app/layout.tsx` — adds the Fraunces (headings, letters) and DM Sans (interface) fonts.
- `app/theme-refresh.css` — landing page and gift page: warm ink + champagne / rose-gold instead of violet.
  Delete this file and its import in `layout.tsx` to go back.

## Apply (PowerShell, from the project folder)
    Expand-Archive -Path "$HOME\Downloads\afterglow-full-project-v2.zip" -DestinationPath . -Force
    npm run build
    git add -A
    git commit -m "Photo viewer, fonts and warm theme"
    git push

---

# Update 3 — montage video maker, glass surfaces, Supabase keep-alive check

## Files in this update (patch)
- NEW `app/lib/montage.ts` — the montage engine: draws each photo, its message and the template
  on a canvas frame by frame, and records it to a video in the browser.
- NEW `app/studio/MontageMaker.tsx` + `montage-maker.css` — the studio panel: choose up to 12 photos,
  write a message for each, reorder, pick a template (Cinematic, Polaroid scrapbook, Dreamy glass),
  add an opening title, a closing line and optional music, preview it, then "Make video for the gift".
  The finished video is added to the gift like any uploaded video.
- NEW `app/glass-refresh.css` — frosted-glass panels in the studio, sign-in card and landing page.
- EDIT `app/studio/page.tsx` — two lines: an import, and `<MontageMaker />` placed above the song picker.
- EDIT `app/layout.tsx` — one line: loads `glass-refresh.css` last.

## Notes
- Keep the browser tab open and in front while a video is made. Browsers slow background tabs, which
  slows the recording. A 4-photo video takes about 16 seconds to make.
- Videos are recorded as WebM in most browsers (MP4 where supported). Both are accepted by the studio.

## Keeping the Supabase project from pausing
The free plan pauses after 7 days with no activity. The daily keep-alive (`app/api/keepalive`, run by
`vercel.json` at 06:00 UTC) runs one read on the `gifts` table each day, which counts as activity.
- Check it's running: Vercel → project → Settings → Cron Jobs should list `/api/keepalive`.
  Then Logs → filter `/api/keepalive`; you should see 200 responses once a day.
- Check the Production environment variables in Vercel include `NEXT_PUBLIC_SUPABASE_URL` and
  `SUPABASE_SECRET_KEY`. If `CRON_SECRET` is set, Vercel sends it automatically.
- The keep-alive is a free workaround. For a project you want to keep permanently, upgrading to
  Supabase Pro removes the pausing rule entirely.

---

# Update 4 — studio fits the screen, Apple-style glass, photo viewer polish

- `app/studio/studio-fit.css` (new, imported in `studio/page.tsx`): on desktop and tablet the top bar stays
  fixed and the sidebar, editor and inspector each scroll inside their own column, so you rarely need to
  scroll the whole page. Phones keep their existing layout.
- `app/apple-glass.css` (new, imported in `layout.tsx`): glass buttons, softer inputs, lifted cards on hover,
  a gentle entrance for panels, system fonts first on Apple devices. Respects reduced motion and reduced transparency.
- `app/g/[slug]/viewer-polish.css` (new, imported in `PhotoViewer.tsx`): photo always fits, clears the iPhone
  notch and home bar, larger touch targets on phones.

Nothing existing was rewritten; each change is a new stylesheet plus one import line.

---

# Update 5 — photo sizing, montage captions, one studio theme, readable share link

- Montage player (`components/montage-fit.css`): each photo fills its space and is shown whole
  (`object-fit: contain`, no cropping or zoom). The caption now sits in its own band under the photo,
  so text no longer overlaps the image.
- Gallery tiles (`g/[slug]/gallery-fit.css`): tiles follow each photo's own shape, so there are no
  empty side bars. Photos are capped at 78% of the screen height so tall photos still fit whole.
- Photo viewer (`g/[slug]/viewer-fit.css`): less top and bottom chrome, and a larger desktop window,
  so the photo gets more of the screen.
- Studio: the colour dots were removed from the top bar. The sunset look is now the only studio theme.
- Share panel: dark to match the studio, with a clearly readable link field.
