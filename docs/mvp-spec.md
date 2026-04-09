# Ravqen MVP Product Spec

## Product vision

Ravqen is a mobile-first training product for members who want a coached,
structured, high-accountability gym session without needing to attend a live
class. The experience is inspired by premium group training principles, but the
programming, taxonomy, and media are original.

The core promise is simple: open the app, press start, and follow a complete
commercial-gym workout with minimal decision fatigue.

## Target user

- Solo gym-goers who like structure but do not want to design their own plan.
- Former group-class members who want the same momentum at a lower monthly cost.
- Small founder-led memberships where the admin manually assigns access before
  billing is automated.

## MVP goals

- Deliver one guided workout per day from Monday to Saturday.
- Make the workout playable at any time during that day.
- Support session replay on the same day.
- Let the member scale intensity up or down during the workout.
- Capture workout feedback to improve future programming.
- Give the admin manual control over membership tiers and access.

## Non-goals for MVP

- No direct copying of third-party programming, video, or branding.
- No live streaming classes.
- No billing automation in phase one.
- No smartwatch or wearable integrations in phase one.
- No desktop-first experience.

## Experience principles

- Structured weekly split
- Timed class flow
- Scalable difficulty
- Guided workout screen
- Progressive programming blocks

## Weekly class system

The product uses rotating class categories with original programming logic:

- `Strength`: heavier compound lifts and controlled accessory work
- `Hyper`: hypertrophy-biased upper or lower volume sessions
- `Cardio HIIT`: short burst conditioning and calorie targets
- `Balanced`: full-body mixed modality training
- `Summit`: ladder or threshold endurance work
- `Crew Fit`: higher-variety density session for fun and volume
- Future categories: `Power`, `Pump`, `Shred`, `Recovery`, `Athletic`

Default weekly rhythm for MVP:

- Monday: Strength
- Tuesday: Hyper
- Wednesday: Cardio HIIT
- Thursday: Balanced
- Friday: Summit
- Saturday: Crew Fit
- Sunday: Rest

## Core member flows

### 1. Daily training flow

1. Member logs in.
2. Member lands on today’s workout card.
3. Member taps `Start workout`.
4. Workout begins with a 3:30 warm-up using 30-second guided movements.
5. Member follows block-by-block instructions with:
   - current exercise timer
   - total session timer
   - target reps / calories / seconds
   - equipment callout
   - demo media
   - progress indicator
6. Member can pause, replay, skip, or adjust intensity.
7. Member finishes and submits load used, effort rating, and optional notes.

### 2. Admin flow

1. Admin creates or invites a member.
2. Admin assigns a manual access tier.
3. Admin enables or disables access.
4. Admin can swap equipment assumptions or exercise selections if local gyms
   differ.
5. Admin reviews adherence and workout feedback.

## Membership model

Manual assignment only in MVP.

Supported tier types:

- `single_session_pack`
- `weekly_limit`
- `monthly_unlimited`
- `complimentary`

Admin controls:

- active / paused / expired
- allowed sessions remaining
- weekly cap
- category access overrides

## Programming engine v1

The first version uses a rules-based generator rather than AI-first generation.

Inputs:

- user goal
- training level
- available equipment profile
- previous workout RPE
- load used in kg
- skipped exercises
- replay frequency

Outputs:

- next workout category
- target rep or calorie prescription
- suggested working range
- optional substitutions
- progression or deload adjustments

Programming logic for MVP:

- Progress load slowly when RPE is within target band.
- Reduce target volume if the user reports excessive fatigue.
- Offer substitutes when equipment is unavailable.
- Keep category rotation stable to preserve habit and familiarity.
- Keep each session between 3 and 12 unique exercises, then reuse those
  movements across multiple rounds or intensity waves instead of constantly
  introducing new stations.

## Data model

### Users

- id
- name
- email
- role (`admin`, `member`)
- training_level
- gym_profile_id

### Memberships

- id
- user_id
- tier_type
- status
- weekly_limit
- sessions_remaining
- starts_at
- ends_at

### Workout Templates

- id
- category
- focus
- block_structure
- estimated_duration_min
- equipment_profile

### Exercises

- id
- name
- movement_pattern
- equipment
- demo_asset_url
- cue_set
- regression_options
- progression_options

### Workout Sessions

- id
- user_id
- workout_template_id
- scheduled_for
- status
- intensity_selected
- replay_count

### Session Results

- id
- session_id
- rpe_score
- notes
- calories_completed
- exercise_logs

### Exercise Logs

- id
- session_result_id
- exercise_id
- weight_kg
- reps_completed
- substitution_used

## MVP screens

### Member

- login
- today dashboard
- guided workout player
- workout complete / feedback
- session history

### Admin

- admin overview
- member list
- membership editor
- workout template editor
- equipment substitution editor

## Media strategy

The product should use licensed or royalty-free exercise demos. MVP should be
built to support media slots even if final assets are added later.

Recommended rollout:

1. Ship with placeholder media slots and clear exercise text cues.
2. Add licensed GIF or short-form MP4 demos for the top 100 exercises.
3. Later optimize delivery through CDN or storage bucket with mobile compression.

## Tech stack

- Frontend: Next.js App Router
- Styling: Tailwind CSS
- Backend: Supabase after prototype validation
- Auth: Supabase Auth in phase two
- Storage: Supabase Storage or equivalent for demo assets
- Billing: Stripe in phase three

## Build phases

### Phase 1

- mobile-first UX
- seeded programming schedule
- guided workout player
- local state for intensity and progress
- product landing page

### Phase 2

- real authentication
- database-backed users and sessions
- admin dashboard
- editable workout templates
- feedback persistence

### Phase 3

- automated billing
- analytics
- richer personalization
- media library
- push reminders and attendance streaks

## Success criteria

- Member can open the app and start the day’s workout in under 10 seconds.
- Workout feels guided enough that the user does not need to think about what
  to do next.
- Admin can manually manage friend memberships without external tooling.
- The product can support small paid usage before billing automation ships.
