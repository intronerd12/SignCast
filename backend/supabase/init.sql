-- ============================================================
-- FSL App — Supabase Init SQL
-- Run in: Supabase Dashboard › SQL Editor › New Query › Run
--
-- Tables
--   public.user_profiles    — one row per auth.users entry
--   public.app_events       — analytics / audit event log
--   public.fsl_sign_samples — FSL gesture recordings & landmarks
-- ============================================================


-- ============================================================
-- 0. Extensions
-- ============================================================
create extension if not exists pgcrypto;


-- ============================================================
-- 1. Tables
-- ============================================================

-- 1a. user_profiles -------------------------------------------
create table if not exists public.user_profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null unique,
  full_name   text,
  phone       text,
  role        text        not null default 'user' check (role in ('user', 'admin')),
  avatar_url  text,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1b. app_events ----------------------------------------------
create table if not exists public.app_events (
  id          bigint      generated always as identity primary key,
  user_id     uuid        references auth.users(id) on delete set null,
  category    text        not null,
  action      text        not null,
  payload     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- 1c. fsl_sign_samples ----------------------------------------
create table if not exists public.fsl_sign_samples (
  id             uuid        primary key default gen_random_uuid(),

  -- Sign identity
  label          text        not null,         -- e.g. "hello", "thank you", "A"
  category       text,                         -- "alphabet" | "word" | "phrase"

  -- Sample source
  recorded_by    uuid        references auth.users(id) on delete set null,
  device         text,                         -- "webcam" | "mobile"
  source         text        default 'user',   -- "user" | "dataset" | "synthetic"

  -- Media / landmark payload
  video_url      text,                         -- Storage path or public URL
  thumbnail_url  text,
  landmarks      jsonb,                        -- MediaPipe hand/pose landmark array
  duration_ms    integer,                      -- clip length in milliseconds
  frame_count    integer,

  -- Quality & review
  is_verified    boolean     default false,
  quality_score  numeric(4,2),                 -- 0.00 – 1.00
  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);


-- ============================================================
-- 2. Indexes
-- ============================================================

-- app_events
create index if not exists idx_app_events_user_id    on public.app_events(user_id);
create index if not exists idx_app_events_category   on public.app_events(category);
create index if not exists idx_app_events_created_at on public.app_events(created_at desc);

-- fsl_sign_samples
create index if not exists idx_fsl_sign_samples_label       on public.fsl_sign_samples(label);
create index if not exists idx_fsl_sign_samples_category    on public.fsl_sign_samples(category);
create index if not exists idx_fsl_sign_samples_recorded_by on public.fsl_sign_samples(recorded_by);
create index if not exists idx_fsl_sign_samples_is_verified on public.fsl_sign_samples(is_verified);
create index if not exists idx_fsl_sign_samples_created_at  on public.fsl_sign_samples(created_at desc);
create index if not exists idx_fsl_sign_samples_landmarks   on public.fsl_sign_samples using gin(landmarks);


-- ============================================================
-- 3. Functions & Triggers
-- ============================================================

-- Shared updated_at function (used by all tables with that column)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- user_profiles
drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- fsl_sign_samples
drop trigger if exists trg_fsl_sign_samples_updated_at on public.fsl_sign_samples;
create trigger trg_fsl_sign_samples_updated_at
  before update on public.fsl_sign_samples
  for each row execute function public.set_updated_at();


-- ============================================================
-- 4. Row Level Security
-- ============================================================

alter table public.user_profiles    enable row level security;
alter table public.app_events       enable row level security;
alter table public.fsl_sign_samples enable row level security;

-- user_profiles -----------------------------------------------
drop policy if exists "Users can read own profile"   on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- app_events --------------------------------------------------
drop policy if exists "Users can read own events"   on public.app_events;
create policy "Users can read own events"
  on public.app_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own events" on public.app_events;
create policy "Users can insert own events"
  on public.app_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- fsl_sign_samples --------------------------------------------
drop policy if exists "Public read verified samples"         on public.fsl_sign_samples;
create policy "Public read verified samples"
  on public.fsl_sign_samples for select
  using (is_verified = true);

drop policy if exists "Users read own samples"              on public.fsl_sign_samples;
create policy "Users read own samples"
  on public.fsl_sign_samples for select
  to authenticated
  using (recorded_by = auth.uid());

drop policy if exists "Users insert own samples"            on public.fsl_sign_samples;
create policy "Users insert own samples"
  on public.fsl_sign_samples for insert
  to authenticated
  with check (recorded_by = auth.uid());

drop policy if exists "Users update own unverified samples" on public.fsl_sign_samples;
create policy "Users update own unverified samples"
  on public.fsl_sign_samples for update
  to authenticated
  using  (recorded_by = auth.uid() and is_verified = false)
  with check (recorded_by = auth.uid());

drop policy if exists "Users delete own unverified samples" on public.fsl_sign_samples;
create policy "Users delete own unverified samples"
  on public.fsl_sign_samples for delete
  to authenticated
  using (recorded_by = auth.uid() and is_verified = false);


-- ============================================================
-- 5. Force PostgREST schema cache reload
-- ============================================================
-- This fixes "Could not find the table in the schema cache" errors
-- that occur immediately after creating a new table.
notify pgrst, 'reload schema';


-- ============================================================
-- 6. Storage bucket (optional — run once, or use the Dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('fsl-videos', 'fsl-videos', false)
-- on conflict do nothing;