create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_events_user_id on public.app_events(user_id);
create index if not exists idx_app_events_category on public.app_events(category);
create index if not exists idx_app_events_created_at on public.app_events(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.app_events enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own events" on public.app_events;
create policy "Users can read own events"
on public.app_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own events" on public.app_events;
create policy "Users can insert own events"
on public.app_events
for insert
to authenticated
with check (auth.uid() = user_id);