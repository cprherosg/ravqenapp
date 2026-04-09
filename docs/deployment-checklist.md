# Ravqen Deployment Checklist

## Core environment

Set these in your production host:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_SESSION_PACK` (optional but recommended for launch)
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_WEEKLY_LIMIT` (optional but recommended for launch)
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_UNLIMITED` (optional but recommended for launch)
- `YMOVE_API_KEY` (optional for Ymove search and refreshed media)

Mirror the same keys in local `.env.local` for development.

## Supabase

Before launch, confirm:

- all required SQL from [supabase/schema.sql](/Users/luqmanhakiim/Projects/sgamts/BFT%20AI%20Program/supabase/schema.sql) has been run
- at least one real admin account has `profiles.is_admin = true`
- member accounts have the correct `tier_type`, `status`, `sessions_remaining`, and `allowed_categories`
- `Complimentary` members have active complimentary access and session credits if you want those counted down

## Media

For local-hosted demo videos:

- place MP4s in [public/exercise-media](/Users/luqmanhakiim/Projects/sgamts/BFT%20AI%20Program/public/exercise-media)
- prefer slug-style filenames like `leg-press.mp4`
- for custom programs, use Program Library `Demo media URL` fields to point to local or remote media

For Ymove:

- keep `YMOVE_API_KEY` server-side only
- treat Ymove signed URLs as temporary
- keep storing exercise references or stable paths in Ravqen, not scraped temporary URLs

## Go-live checks

Test these flows in production:

1. Admin login and `/admin` access
2. Create member
3. Set temporary password
4. Member login
5. Complimentary member sees `Complimentary` every day
6. Session-pack or complimentary credits decrement after save
7. Weekly-limit members get blocked after their limit
8. Program Library edits appear in `/player/workout`
9. Exercise videos load correctly on mobile
10. Password reset flow returns to Ravqen correctly
11. `/plans`, `/support`, `/privacy`, and `/terms` load correctly
12. Plan CTA buttons either open valid payment links or fall back cleanly to support email

## Recommended host

Vercel is the simplest host for this codebase:

- connect the repo
- add production environment variables
- deploy the main branch
- point `ravqen.app` to the Vercel project

## Post-deploy smoke test

After the first live deployment, verify:

- homepage loads
- plans page loads
- login works
- `/player` shows the correct workout for the signed-in member
- `/player/workout` can start, save, and return
- `/admin` is blocked for non-admin members
- media loads on both Wi‑Fi and mobile data

## Local smoke command

Before shipping a release candidate, run:

```bash
npm run smoke:local
```

Expected behavior:

- public routes return `200`
- protected member/admin routes redirect to `/login` when not signed in
