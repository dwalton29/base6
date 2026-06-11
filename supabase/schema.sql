-- base6 starter Supabase schema
-- Run this in a NEW Supabase project SQL editor.
-- For quickest local testing: Auth > Providers > Email > turn OFF "Confirm email".

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  passport_number text unique not null,
  platform text,
  platform_handle text,
  avatar_url text,
  crime_history text,
  san_andreas_since_year integer,
  business_type text,
  business_custom_text text,
  bio text,
  reputation_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passport_stamps (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_passport_stamps (
  user_id uuid references public.profiles(id) on delete cascade,
  stamp_id uuid references public.passport_stamps(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, stamp_id)
);

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  banner_url text,
  recruitment_status text not null default 'open',
  reputation_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id uuid references public.crews(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles(id) on delete set null,
  crew_id uuid references public.crews(id) on delete set null,
  title text not null,
  session_type text not null default 'casual',
  platform text,
  starts_at timestamptz,
  max_players integer,
  description text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade,
  post_type text not null default 'social',
  title text,
  body text,
  image_url text,
  created_at timestamptz not null default now()
);


create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles(id) on delete set null,
  title text not null,
  event_type text not null default 'community',
  description text,
  starts_at timestamptz,
  status text not null default 'upcoming',
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  points integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.passport_stamps (code, name, description, icon, sort_order)
values
  ('checked_in', 'Checked In', 'Issued your first Leonida boarding pass.', '✈️', 10),
  ('san_andreas_veteran', 'San Andreas Veteran', 'Declared previous time in San Andreas.', '🌴', 20)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

alter table public.profiles enable row level security;
alter table public.passport_stamps enable row level security;
alter table public.user_passport_stamps enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.sessions enable row level security;
alter table public.community_posts enable row level security;
alter table public.reputation_events enable row level security;
alter table public.community_events enable row level security;

-- Public profile/passport browsing.
drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable" on public.profiles for select using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Stamps are public" on public.passport_stamps;
create policy "Stamps are public" on public.passport_stamps for select using (true);

drop policy if exists "User stamps are public" on public.user_passport_stamps;
create policy "User stamps are public" on public.user_passport_stamps for select using (true);

drop policy if exists "Users can grant own onboarding stamps" on public.user_passport_stamps;
create policy "Users can grant own onboarding stamps" on public.user_passport_stamps for insert with check (auth.uid() = user_id);

-- Starter open read/write policies for MVP features. Tighten these before public launch.
drop policy if exists "Crews are public" on public.crews;
create policy "Crews are public" on public.crews for select using (true);
drop policy if exists "Authenticated users can create crews" on public.crews;
create policy "Authenticated users can create crews" on public.crews for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update crews" on public.crews;
create policy "Owners can update crews" on public.crews for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Crew members are public" on public.crew_members;
create policy "Crew members are public" on public.crew_members for select using (true);
drop policy if exists "Users can join as themselves" on public.crew_members;
create policy "Users can join as themselves" on public.crew_members for insert with check (auth.uid() = user_id);

drop policy if exists "Sessions are public" on public.sessions;
create policy "Sessions are public" on public.sessions for select using (true);
drop policy if exists "Authenticated users can create sessions" on public.sessions;
create policy "Authenticated users can create sessions" on public.sessions for insert with check (auth.uid() = host_id);

drop policy if exists "Community posts are public" on public.community_posts;
create policy "Community posts are public" on public.community_posts for select using (true);
drop policy if exists "Authenticated users can post" on public.community_posts;
create policy "Authenticated users can post" on public.community_posts for insert with check (auth.uid() = author_id);

drop policy if exists "Reputation events are public" on public.reputation_events;
create policy "Reputation events are public" on public.reputation_events for select using (true);

drop policy if exists "Authenticated users can add reputation events" on public.reputation_events;
create policy "Authenticated users can add reputation events" on public.reputation_events for insert with check (auth.uid() = actor_user_id);


drop policy if exists "Community events are public" on public.community_events;
create policy "Community events are public" on public.community_events for select using (true);
drop policy if exists "Authenticated users can create events" on public.community_events;
create policy "Authenticated users can create events" on public.community_events for insert with check (auth.uid() = host_id);
drop policy if exists "Hosts can update events" on public.community_events;
create policy "Hosts can update events" on public.community_events for update using (auth.uid() = host_id) with check (auth.uid() = host_id);


insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects for insert with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects for update using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);


create or replace function public.increment_reputation(profile_id uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set reputation_score = coalesce(reputation_score, 0) + amount,
      updated_at = now()
  where id = profile_id;
end;
$$;

grant execute on function public.increment_reputation(uuid, integer) to authenticated;
