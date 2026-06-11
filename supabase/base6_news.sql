-- Base6 News System
-- Run this in Supabase SQL editor, then add rows from the table editor.

create table if not exists public.base6_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  summary text,
  body text,
  category text not null default 'BASE6',
  image_url text,
  source_url text,
  source_label text,
  video_url text,
  published_at timestamptz not null default now(),
  is_featured boolean not null default false,
  is_published boolean not null default true,
  display_priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.base6_news enable row level security;

drop policy if exists "Published Base6 news is public" on public.base6_news;
create policy "Published Base6 news is public"
  on public.base6_news
  for select
  using (is_published = true);

create index if not exists base6_news_published_idx
  on public.base6_news (is_published, display_priority, published_at desc);

-- Optional starter rows. Edit/delete these after testing.
insert into public.base6_news (
  title,
  slug,
  summary,
  body,
  category,
  source_url,
  source_label,
  video_url,
  is_featured,
  display_priority
) values
  (
    'Trailer watch: Leonida boarding lounge is open',
    'trailer-watch-leonida-boarding-lounge',
    'Use this card for official trailers, Rockstar links and YouTube breakdowns.',
    'Starter Base6 news post.',
    'TRAILER',
    'https://www.rockstargames.com/VI',
    'Official GTA VI page',
    'https://www.youtube.com/@RockstarGames',
    true,
    1
  ),
  (
    'Base6 passports are now boarding',
    'base6-passports-boarding',
    'Patch notes, new stamps, passport updates and community feature drops can live here.',
    'Starter Base6 update post.',
    'BASE6',
    '/lounge',
    'Open lounge',
    null,
    false,
    20
  )
on conflict (slug) do nothing;
