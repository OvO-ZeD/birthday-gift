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
