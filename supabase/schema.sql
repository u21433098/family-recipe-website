-- =====================================================================
--  Family recipe website — Supabase database setup
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Then run the two lines in "STEP 2" at the bottom with YOUR details.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tables ----------

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),     -- only ever one row
  owner_email text not null,
  viewer_passcode_hash text not null
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  added_by text,
  category text not null check (category in (
    'starters','beef','chicken','lamb','pork','desserts',
    'salads-sides','dips-sauces','drinks')),
  servings text,
  ingredients text not null,          -- one ingredient per line
  steps text not null,                -- one step per line
  notes text,
  story text,                         -- "where it was first discovered" etc.
  source_url text,                    -- e.g. the Pinterest pin
  photos text[] not null default '{}',-- ready for pictures later
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  author text not null check (char_length(author) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_recipe_idx on public.comments(recipe_id);

-- ---------- Who is the owner? ----------

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from site_settings
    where lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.passcode_ok(p_passcode text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from site_settings
    where viewer_passcode_hash = crypt(coalesce(p_passcode, ''), viewer_passcode_hash)
  );
$$;

-- ---------- Row level security: only the owner touches tables directly ----------

alter table public.site_settings enable row level security;
alter table public.recipes       enable row level security;
alter table public.comments      enable row level security;

drop policy if exists owner_all_recipes  on public.recipes;
drop policy if exists owner_all_comments on public.comments;
create policy owner_all_recipes  on public.recipes  for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all_comments on public.comments for all using (public.is_owner()) with check (public.is_owner());
-- site_settings has no policies: nobody can read it through the API.

-- ---------- Functions friends & family use (need the passcode) ----------

create or replace function public.check_passcode(p_passcode text) returns boolean
language sql stable security definer set search_path = public as $$
  select passcode_ok(p_passcode) or is_owner();
$$;

create or replace function public.get_recipes(p_passcode text)
returns setof public.recipes
language plpgsql stable security definer set search_path = public as $$
begin
  if not (passcode_ok(p_passcode) or is_owner()) then
    raise exception 'bad passcode' using errcode = '28000';
  end if;
  return query select * from recipes order by created_at desc;
end $$;

create or replace function public.get_comments(p_passcode text, p_recipe_id uuid)
returns setof public.comments
language plpgsql stable security definer set search_path = public as $$
begin
  if not (passcode_ok(p_passcode) or is_owner()) then
    raise exception 'bad passcode' using errcode = '28000';
  end if;
  return query select * from comments where recipe_id = p_recipe_id order by created_at;
end $$;

create or replace function public.add_comment(p_passcode text, p_recipe_id uuid, p_author text, p_body text)
returns public.comments
language plpgsql security definer set search_path = public as $$
declare c comments;
begin
  if not (passcode_ok(p_passcode) or is_owner()) then
    raise exception 'bad passcode' using errcode = '28000';
  end if;
  insert into comments(recipe_id, author, body)
  values (p_recipe_id, left(trim(p_author), 60), left(trim(p_body), 1000))
  returning * into c;
  return c;
end $$;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists recipes_touch on public.recipes;
create trigger recipes_touch before update on public.recipes
for each row execute function public.touch_updated_at();

grant execute on function public.check_passcode(text)                 to anon, authenticated;
grant execute on function public.get_recipes(text)                    to anon, authenticated;
grant execute on function public.get_comments(text, uuid)             to anon, authenticated;
grant execute on function public.add_comment(text, uuid, text, text)  to anon, authenticated;

-- =====================================================================
--  STEP 2 — put in YOUR email and the passcode for friends & family,
--  then select just these lines and Run them.
--  (Run again any time to change the passcode.)
-- =====================================================================
-- insert into public.site_settings (id, owner_email, viewer_passcode_hash)
-- values (1, 'you@example.com', extensions.crypt('change-me', extensions.gen_salt('bf')))
-- on conflict (id) do update
--   set owner_email = excluded.owner_email,
--       viewer_passcode_hash = excluded.viewer_passcode_hash;
