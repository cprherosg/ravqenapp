## Ravqen

Mobile-first training product prototype for guided solo workouts in commercial
gyms. The concept is inspired by premium group fitness structure, but the
programming and UX are original.

## What is in this repo

- Product landing page with MVP positioning
- Seeded weekly class rotation
- Guided workout player prototype
- MVP product spec in [docs/mvp-spec.md](./docs/mvp-spec.md)

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current structure

- `app/page.tsx`: product overview and scope snapshot
- `app/player/page.tsx`: mobile workout player route
- `components/workout-player.tsx`: guided timer-based player
- `lib/data.ts`: seed programming and workout data
- `lib/types.ts`: typed workout and membership domain models
- `docs/mvp-spec.md`: full product requirements and phased roadmap

## Next steps

- Add Supabase auth and persistence
- Build the admin membership console
- Add workout feedback storage and progression rules
- Plug in licensed exercise demo media
