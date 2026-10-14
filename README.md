# Afterglow Gift Studio

Next.js 16 App Router project with the Obsidian Violet landing page, Supabase-backed studio, private gift media routes, login, and publishing endpoints.

## Local setup

1. Install Node.js 20+ (Node.js 22 is fine).
2. Copy `.env.example` to `.env.local` and fill in your own Supabase values. Never commit `.env.local`.
3. Install dependencies and run the production build:

```powershell
npm install
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Upload this project to a new GitHub repository or replace the contents of your existing project folder.
2. In Vercel, configure the same environment variables listed in `.env.example` with the real values from your Supabase project.
3. Deploy. Check the build log before sharing the URL.

## Important

- The ZIP intentionally excludes `.env.local`, `.vercel`, `.git`, and `node_modules`. Add your own environment values after extracting it.
- Keep `SUPABASE_SECRET_KEY` and `GIFT_ACCESS_SECRET` server-side only. Never expose them in client-side code.
- The homepage showcase uses illustrative external sample video/image URLs. The hero art is included at `public/images/afterglow-landing.png`.
- Existing gift studio, authentication, protected media endpoints, and publishing files are included. Supabase database/storage permissions must be configured in your own project for publishing to work.
