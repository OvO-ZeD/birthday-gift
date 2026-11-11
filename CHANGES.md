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
