-- ============================================================
-- BASE6 SOCIAL SYSTEM
-- Feed, LFG, crew recruitment, advice/media posts, comments,
-- likes, follows and reporting.
-- Run after the Base6 profile expansion migration.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Shared updated_at helper
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Community posts expansion
-- ------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  post_type text not null default 'social',
  title text,
  body text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.community_posts
  add column if not exists social_tag text not null default 'SOCIAL',
  add column if not exists game_context text not null default 'GTA_VI',
  add column if not exists platform text,
  add column if not exists lfg_category text,
  add column if not exists lfg_players_needed integer,
  add column if not exists lfg_start_at timestamptz,
  add column if not exists lfg_end_at timestamptz,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists report_count integer not null default 0,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.community_posts
set
  game_context = case
    when upper(coalesce(game_context, 'GTA_VI')) in ('GTA_V', 'GTA V', 'GTAV', 'GTA5', 'GTA 5') then 'GTA_V'
    else 'GTA_VI'
  end,
  social_tag = case
    when upper(coalesce(social_tag, post_type, 'SOCIAL')) in ('LFG', 'LOOKING_FOR_GROUP') then 'LFG'
    when upper(coalesce(social_tag, post_type, 'SOCIAL')) in ('CREW', 'CREWS') then 'CREW'
    when upper(coalesce(social_tag, post_type, 'SOCIAL')) in ('ADVICE', 'QUESTION') then 'ADVICE'
    when upper(coalesce(social_tag, post_type, 'SOCIAL')) in ('MEDIA', 'IMAGE', 'CLIP') then 'MEDIA'
    else 'SOCIAL'
  end,
  post_type = coalesce(post_type, 'social'),
  like_count = coalesce(like_count, 0),
  comment_count = coalesce(comment_count, 0),
  report_count = coalesce(report_count, 0),
  is_deleted = coalesce(is_deleted, false),
  updated_at = coalesce(updated_at, created_at, now())
where true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_posts_social_tag_check') then
    alter table public.community_posts
      add constraint community_posts_social_tag_check
      check (social_tag in ('SOCIAL', 'LFG', 'CREW', 'ADVICE', 'MEDIA'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'community_posts_game_context_check') then
    alter table public.community_posts
      add constraint community_posts_game_context_check
      check (game_context in ('GTA_V', 'GTA_VI'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'community_posts_players_needed_check') then
    alter table public.community_posts
      add constraint community_posts_players_needed_check
      check (lfg_players_needed is null or lfg_players_needed between 1 and 99);
  end if;
end $$;

create index if not exists community_posts_created_at_idx on public.community_posts(created_at desc);
create index if not exists community_posts_author_idx on public.community_posts(author_id);
create index if not exists community_posts_social_tag_idx on public.community_posts(social_tag);
create index if not exists community_posts_game_context_idx on public.community_posts(game_context);
create index if not exists community_posts_platform_idx on public.community_posts(platform);
create index if not exists community_posts_lfg_start_at_idx on public.community_posts(lfg_start_at);
create index if not exists community_posts_is_deleted_idx on public.community_posts(is_deleted);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
before update on public.community_posts
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Comments
-- ------------------------------------------------------------
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  parent_comment_id uuid references public.community_comments(id) on delete cascade,
  body text,
  like_count integer not null default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_comments
  add column if not exists parent_comment_id uuid,
  add column if not exists like_count integer not null default 0,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_comments_parent_comment_id_fkey') then
    alter table public.community_comments
      add constraint community_comments_parent_comment_id_fkey
      foreign key (parent_comment_id) references public.community_comments(id) on delete cascade;
  end if;
end $$;

create index if not exists community_comments_post_idx on public.community_comments(post_id);
create index if not exists community_comments_author_idx on public.community_comments(author_id);
create index if not exists community_comments_parent_idx on public.community_comments(parent_comment_id);
create index if not exists community_comments_created_at_idx on public.community_comments(created_at);

drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
before update on public.community_comments
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Likes
-- ------------------------------------------------------------
create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists community_post_likes_user_idx on public.community_post_likes(user_id);
create index if not exists community_post_likes_post_idx on public.community_post_likes(post_id);

create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists community_comment_likes_user_idx on public.community_comment_likes(user_id);
create index if not exists community_comment_likes_comment_idx on public.community_comment_likes(comment_id);

-- ------------------------------------------------------------
-- Follows, reused by the Following social tab
-- ------------------------------------------------------------
create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists profile_follows_follower_idx on public.profile_follows(follower_id);
create index if not exists profile_follows_following_idx on public.profile_follows(following_id);

-- ------------------------------------------------------------
-- Reports
-- ------------------------------------------------------------
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_reports_target_check check (post_id is not null or comment_id is not null)
);

create index if not exists community_reports_status_idx on public.community_reports(status);
create index if not exists community_reports_post_idx on public.community_reports(post_id);
create index if not exists community_reports_comment_idx on public.community_reports(comment_id);
create index if not exists community_reports_reporter_idx on public.community_reports(reporter_id);

drop trigger if exists community_reports_set_updated_at on public.community_reports;
create trigger community_reports_set_updated_at
before update on public.community_reports
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Counter triggers
-- ------------------------------------------------------------
create or replace function public.refresh_post_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set like_count = greatest(0, coalesce(like_count, 0) + 1)
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
    set like_count = greatest(0, coalesce(like_count, 0) - 1)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists community_post_likes_count_insert on public.community_post_likes;
drop trigger if exists community_post_likes_count_delete on public.community_post_likes;
create trigger community_post_likes_count_insert
after insert on public.community_post_likes
for each row execute function public.refresh_post_like_count();
create trigger community_post_likes_count_delete
after delete on public.community_post_likes
for each row execute function public.refresh_post_like_count();

create or replace function public.refresh_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set comment_count = greatest(0, coalesce(comment_count, 0) + 1)
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
    set comment_count = greatest(0, coalesce(comment_count, 0) - 1)
    where id = old.post_id;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.is_deleted = false and new.is_deleted = true then
      update public.community_posts
      set comment_count = greatest(0, coalesce(comment_count, 0) - 1)
      where id = new.post_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update public.community_posts
      set comment_count = greatest(0, coalesce(comment_count, 0) + 1)
      where id = new.post_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists community_comments_count_insert on public.community_comments;
drop trigger if exists community_comments_count_delete on public.community_comments;
drop trigger if exists community_comments_count_update on public.community_comments;
create trigger community_comments_count_insert
after insert on public.community_comments
for each row execute function public.refresh_post_comment_count();
create trigger community_comments_count_delete
after delete on public.community_comments
for each row execute function public.refresh_post_comment_count();
create trigger community_comments_count_update
after update of is_deleted on public.community_comments
for each row execute function public.refresh_post_comment_count();

create or replace function public.refresh_comment_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_comments
    set like_count = greatest(0, coalesce(like_count, 0) + 1)
    where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_comments
    set like_count = greatest(0, coalesce(like_count, 0) - 1)
    where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists community_comment_likes_count_insert on public.community_comment_likes;
drop trigger if exists community_comment_likes_count_delete on public.community_comment_likes;
create trigger community_comment_likes_count_insert
after insert on public.community_comment_likes
for each row execute function public.refresh_comment_like_count();
create trigger community_comment_likes_count_delete
after delete on public.community_comment_likes
for each row execute function public.refresh_comment_like_count();

create or replace function public.refresh_post_report_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.post_id is not null then
    update public.community_posts
    set report_count = greatest(0, coalesce(report_count, 0) + 1)
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' and old.post_id is not null then
    update public.community_posts
    set report_count = greatest(0, coalesce(report_count, 0) - 1)
    where id = old.post_id;
    return old;
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists community_reports_count_insert on public.community_reports;
drop trigger if exists community_reports_count_delete on public.community_reports;
create trigger community_reports_count_insert
after insert on public.community_reports
for each row execute function public.refresh_post_report_count();
create trigger community_reports_count_delete
after delete on public.community_reports
for each row execute function public.refresh_post_report_count();

-- ------------------------------------------------------------
-- Backfill counts from existing rows
-- ------------------------------------------------------------
update public.community_posts p
set like_count = coalesce(l.count, 0)
from (
  select post_id, count(*)::integer as count
  from public.community_post_likes
  group by post_id
) l
where p.id = l.post_id;

update public.community_posts p
set comment_count = coalesce(c.count, 0)
from (
  select post_id, count(*)::integer as count
  from public.community_comments
  where coalesce(is_deleted, false) = false
  group by post_id
) c
where p.id = c.post_id;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comment_likes enable row level security;
alter table public.profile_follows enable row level security;
alter table public.community_reports enable row level security;

-- Posts
drop policy if exists "Community posts are publicly readable" on public.community_posts;
create policy "Community posts are publicly readable"
on public.community_posts
for select
using (coalesce(is_deleted, false) = false);

drop policy if exists "Users can create community posts" on public.community_posts;
create policy "Users can create community posts"
on public.community_posts
for insert
with check (auth.uid() = author_id);

drop policy if exists "Users can update their own community posts" on public.community_posts;
create policy "Users can update their own community posts"
on public.community_posts
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own community posts" on public.community_posts;
create policy "Users can delete their own community posts"
on public.community_posts
for delete
using (auth.uid() = author_id);

-- Comments
drop policy if exists "Community comments are publicly readable" on public.community_comments;
create policy "Community comments are publicly readable"
on public.community_comments
for select
using (coalesce(is_deleted, false) = false);

drop policy if exists "Users can create community comments" on public.community_comments;
create policy "Users can create community comments"
on public.community_comments
for insert
with check (auth.uid() = author_id);

drop policy if exists "Users can update their own community comments" on public.community_comments;
create policy "Users can update their own community comments"
on public.community_comments
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own community comments" on public.community_comments;
create policy "Users can delete their own community comments"
on public.community_comments
for delete
using (auth.uid() = author_id);

-- Likes
drop policy if exists "Post likes are publicly readable" on public.community_post_likes;
create policy "Post likes are publicly readable"
on public.community_post_likes
for select
using (true);

drop policy if exists "Users can like posts" on public.community_post_likes;
create policy "Users can like posts"
on public.community_post_likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike posts" on public.community_post_likes;
create policy "Users can unlike posts"
on public.community_post_likes
for delete
using (auth.uid() = user_id);

drop policy if exists "Comment likes are publicly readable" on public.community_comment_likes;
create policy "Comment likes are publicly readable"
on public.community_comment_likes
for select
using (true);

drop policy if exists "Users can like comments" on public.community_comment_likes;
create policy "Users can like comments"
on public.community_comment_likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike comments" on public.community_comment_likes;
create policy "Users can unlike comments"
on public.community_comment_likes
for delete
using (auth.uid() = user_id);

-- Follows
drop policy if exists "Profile follows are publicly readable" on public.profile_follows;
create policy "Profile follows are publicly readable"
on public.profile_follows
for select
using (true);

drop policy if exists "Users can follow from their own account" on public.profile_follows;
create policy "Users can follow from their own account"
on public.profile_follows
for insert
with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow from their own account" on public.profile_follows;
create policy "Users can unfollow from their own account"
on public.profile_follows
for delete
using (auth.uid() = follower_id);

-- Reports
drop policy if exists "Users can create community reports" on public.community_reports;
create policy "Users can create community reports"
on public.community_reports
for insert
with check (auth.uid() = reporter_id);

drop policy if exists "Users can read their own community reports" on public.community_reports;
create policy "Users can read their own community reports"
on public.community_reports
for select
using (auth.uid() = reporter_id);

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;

grant select on public.community_comments to anon, authenticated;
grant insert, update, delete on public.community_comments to authenticated;

grant select on public.community_post_likes to anon, authenticated;
grant insert, delete on public.community_post_likes to authenticated;

grant select on public.community_comment_likes to anon, authenticated;
grant insert, delete on public.community_comment_likes to authenticated;

grant select on public.profile_follows to anon, authenticated;
grant insert, delete on public.profile_follows to authenticated;

grant insert, select on public.community_reports to authenticated;

-- ============================================================
-- Done
-- ============================================================
