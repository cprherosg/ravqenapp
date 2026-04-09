# Ravqen Supabase Setup

## Current status

The app now has:

- Supabase client utilities for browser and server use
- a magic-link login page at `/login`
- a server-side admin member loader that falls back to mock data until the
  database tables exist

## Next step in Supabase dashboard

Open your Supabase project and go to `SQL Editor`.

Create a new query and paste in the contents of:

- `supabase/schema.sql`

Then run it once.

## What the schema creates

- `profiles`
- `memberships`
- `workout_templates`
- `workout_sessions`
- `session_feedback`

It also:

- enables RLS
- creates starter policies
- creates an auth trigger to automatically insert a profile row when a user
  signs up

## After the schema is applied

The next implementation step is to:

1. connect the admin member create flow to Supabase
2. persist workout session completion and feedback
3. start storing generated workouts and templates in the database
