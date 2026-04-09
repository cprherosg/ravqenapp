create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  is_admin boolean not null default false,
  last_workout_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  tier_type text not null check (
    tier_type in ('single_session_pack', 'weekly_limit', 'monthly_unlimited', 'complimentary')
  ),
  status text not null check (status in ('active', 'paused', 'expired')),
  weekly_limit integer not null default 3 check (weekly_limit >= 0),
  sessions_remaining integer not null default 0 check (sessions_remaining >= 0),
  allowed_categories text[] not null default '{}',
  gym_profile text,
  equipment_override text,
  goal_focus text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  focus text not null,
  estimated_duration_min integer not null default 45,
  is_active boolean not null default true,
  structure jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_slug text not null,
  scheduled_for date not null,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'in_progress', 'completed', 'skipped')
  ),
  intensity_selected text not null default 'base' check (
    intensity_selected in ('low', 'base', 'high')
  ),
  replay_count integer not null default 0 check (replay_count >= 0),
  feedback_submitted boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.workout_sessions (id) on delete cascade,
  rpe integer check (rpe between 1 and 10),
  load_summary text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_performance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_key text not null,
  exercise_name text not null,
  serial integer not null default 0,
  phase text not null default '',
  round_label text not null default '',
  equipment text not null default '',
  target_label text not null default '',
  target_unit text,
  achieved_value text,
  load_value text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.member_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('waiver', 'terms')),
  document_version text not null,
  accepted_name text not null default '',
  signature_data_url text not null default '',
  accepted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists exercise_performance_session_exercise_key_idx
on public.exercise_performance (session_id, exercise_key);

create unique index if not exists member_legal_acceptances_user_document_type_idx
on public.member_legal_acceptances (user_id, document_type);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.exercise_performance enable row level security;
alter table public.member_legal_acceptances enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "memberships_select_self" on public.memberships;
create policy "memberships_select_self"
on public.memberships
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "workout_templates_select_authenticated" on public.workout_templates;
create policy "workout_templates_select_authenticated"
on public.workout_templates
for select
to authenticated
using (is_active = true);

drop policy if exists "workout_sessions_select_self" on public.workout_sessions;
create policy "workout_sessions_select_self"
on public.workout_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "workout_sessions_insert_self" on public.workout_sessions;
create policy "workout_sessions_insert_self"
on public.workout_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_update_self" on public.workout_sessions;
create policy "workout_sessions_update_self"
on public.workout_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "session_feedback_select_via_session" on public.session_feedback;
create policy "session_feedback_select_via_session"
on public.session_feedback
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = session_feedback.session_id
      and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "session_feedback_insert_via_session" on public.session_feedback;
create policy "session_feedback_insert_via_session"
on public.session_feedback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = session_feedback.session_id
      and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "exercise_performance_select_via_session" on public.exercise_performance;
create policy "exercise_performance_select_via_session"
on public.exercise_performance
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = exercise_performance.session_id
      and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "exercise_performance_insert_via_session" on public.exercise_performance;
create policy "exercise_performance_insert_via_session"
on public.exercise_performance
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = exercise_performance.session_id
      and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "exercise_performance_update_via_session" on public.exercise_performance;
create policy "exercise_performance_update_via_session"
on public.exercise_performance
for update
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = exercise_performance.session_id
      and workout_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = exercise_performance.session_id
      and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "exercise_performance_delete_via_session" on public.exercise_performance;
create policy "exercise_performance_delete_via_session"
on public.exercise_performance
for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions
    where workout_sessions.id = exercise_performance.session_id
      and workout_sessions.user_id = auth.uid()
  )
);

drop policy if exists "member_legal_acceptances_select_self" on public.member_legal_acceptances;
create policy "member_legal_acceptances_select_self"
on public.member_legal_acceptances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "member_legal_acceptances_insert_self" on public.member_legal_acceptances;
create policy "member_legal_acceptances_insert_self"
on public.member_legal_acceptances
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "member_legal_acceptances_update_self" on public.member_legal_acceptances;
create policy "member_legal_acceptances_update_self"
on public.member_legal_acceptances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
