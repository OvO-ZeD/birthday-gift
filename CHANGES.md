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

# Final — Afterglow Update 4 restored, with montage and photo viewer sizing

- Landing page, memory tiles, gift page and studio are exactly as in Afterglow Update 4.
- Montage player (`app/components/montage-fit.css`): photos fill the space above a compact caption;
  captions no longer overlap the photo; the window is larger on desktop.
- Photo viewer (`app/g/[slug]/viewer-fit.css`): on desktop the window fills the screen so the photo is larger.

---

# Background photographs: clearer, same identity

- `app/g/[slug]/background-clarity.css` (new, imported in the gift page): the background photographs are
  now nearly sharp, and the veil over them is light. The paper colour still takes over toward the bottom,
  so the letter and memories stay readable. Scoped to the gift page only.

---

# TypeUI design pass: touch targets

- Applied the TypeUI rule that touch targets are at least 44 × 44 px. On touch screens only, small studio
  and recipient controls get a larger invisible tap area (`app/studio/studio-touch.css`,
  `app/g/[slug]/gift-touch.css`). Their look and layout do not change; desktop is unaffected.
- Checked: studio colours already pass WCAG AA contrast (lowest 6.3:1 for secondary text).
- Press feedback on gift page buttons: they scale to 97% the instant they are pressed (Apple and Emil
  Kowalski guidance), and this is turned off for people who ask for reduced motion.

---

# Gallery tiles fit their photos

- `app/g/[slug]/gift-gallery-fit.css` (new, imported in the gift page): each memory tile now takes its photo's
  own shape, so the whole photo shows without cropping. Column widths and the grid layout are unchanged.
