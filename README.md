# base6 local prototype

base6 is an unofficial GTA 6 community/passport hub prototype generated from the Trader29 direction.

This version has the first real Supabase wiring pass across the core pages: check-in signup, avatar upload, passport profile, stamps, lounge, crews, sessions, feed, events, reputation and admin stats.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create a fresh Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Go to **Authentication > Providers > Email** and, for quickest local testing, turn **Confirm email** off.
4. Go to **Project Settings > API** / **Connect** and copy:
   - Project URL into `NEXT_PUBLIC_SUPABASE_URL`
   - publishable/anon public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Restart `npm run dev` after editing `.env.local`.

If you already ran an older schema, run the updated `supabase/schema.sql` again. It includes `if not exists` tables, policy drops/recreates, the `community_events` table, and the `increment_reputation` function.

## What is wired

- `/signup` creates a Supabase auth user.
- The selected ID/profile picture uploads to the public `avatars` bucket.
- A row is inserted into `profiles` with the check-in answers.
- Every user gets the `Checked In` passport stamp.
- San Andreas veterans also get the `San Andreas Veteran` starter stamp.
- `/login` signs users back in.
- `/passport` reads and displays the signed-in user’s real Supabase profile and stamps.
- `/lounge` now reads the current user, newest arrivals, live crews, sessions and feed posts.
- `/crews` reads and creates real crew rows.
- `/sessions` reads and creates real LFG/session rows.
- `/feed` reads and creates real community posts.
- `/events` reads and creates real community event rows.
- `/reputation` reads profiles and reputation events, and can add MVP reputation notes.
- `/admin` shows live counts and recent arrivals.

## Still MVP/demo for now

- Public profile share pages are not built yet.
- Join crew / join session / comments / likes are not built yet.
- Admin is not permission-locked yet; treat it as a local/dev stats page.
- RLS is MVP-friendly and should be tightened before a real public launch.
- Payments, ads, push notifications, Android/TWA and moderation workflows are not included yet.


## Vercel install note
This build uses the same npm dependency shape as Trader29. In Vercel, leave Install Command as default or set it to `npm install`.
