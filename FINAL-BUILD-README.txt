AFTERGLOW FINAL BUILD

This is a complete source ZIP combining:
- The current Afterglow homepage and its motion/aurora styling.
- The current gift creation studio and preview styling, with accessibility and media-fit refinements.
- The latest recipient page implementation with a two-sided photo collage, natural media proportions, tighter spacing and gallery polish.
- Existing Supabase/auth/publish/unlock/media routes and configuration templates.

SAFETY
- .env.local is intentionally NOT included. Keep your existing .env.local unchanged.
- node_modules, .next, and .git are intentionally NOT included. Do not delete your existing .env.local.
- This ZIP contains source files, not your private credentials or uploaded gift data.

HOW TO APPLY TO AN EXISTING PROJECT
1. Back up your current project folder or commit your current changes first.
2. Extract this ZIP.
3. Copy the contents of the extracted folder into your existing birthday-gift project folder, allowing source files to be replaced.
4. Do NOT overwrite or delete .env.local.
5. In VS Code terminal, run:
   npm ci
   npm run build
6. If the build succeeds, inspect the homepage, /studio, and a real /g/[slug] gift link locally before publishing.
7. Commit and push the changes to main only after visual checks pass.

Important: a build verifies compilation and types, not all visual behaviour. Test with a gift containing a portrait photo, a landscape photo, a video, a long letter, and a small phone viewport.

FINAL POLISH UPDATE (October 2026)

Included in this archive:
- Safer default HTTP response headers (content-type sniffing, framing, referrer, permissions, opener isolation).
- Personal gift pages and account/studio routes marked noindex so they are less likely to appear in search results.
- A robots.txt route that keeps studio, login, API, and auth paths out of crawler discovery.
- A branded recovery page for unexpected application errors and a branded 404 page.
- Studio media upload guardrails: supported file extensions, per-file size limits (images 25 MB, videos 150 MB, audio 30 MB), and a maximum of 40 photos/videos per gift, with user-facing skip notices.
- Safer media response headers and inline display restricted to common raster-image, video, and audio MIME types. Unknown types download as attachments.
- Sensitive publish/unlock API responses use no-store caching and unlock errors avoid exposing internal exception messages.

IMPORTANT DEPLOYMENT NOTES
- Keep your existing .env.local file. It is intentionally not included in this ZIP.
- The studio checks upload types and sizes in the browser. For defense in depth, set matching maximum object size and allowed MIME types in the Supabase Storage settings for the private `gift-media` bucket; direct-to-storage uploads must also be constrained there.
- Gift unlock rate limiting is not implemented by this archive. Add a shared rate-limit provider before relying on password protection for high-risk or widely distributed links.
- Run `npm ci` and `npm run build` locally before pushing. Dependency installation/build could not be completed in the packaging environment, so this archive is not represented as build-verified here.
