-- Cooper's Spelling Slugger — initial schema.
-- One family per parent account. Every row is reachable only through the family's players,
-- and row-level security (RLS) enforces that on the server for every table.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- families
create table public.families (
  id uuid primary key default gen_random_uuid(),
  parent_pin_hash text,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'parent',
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members(user_id);

-- ---------------------------------------------------------------- players
create table public.players (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(name) between 1 and 30),
  team_name text not null default '',
  jersey_number int not null check (jersey_number between 0 and 99),
  batting_hand text not null check (batting_hand in ('L','R')),
  appearance jsonb not null,
  created_at timestamptz not null default now()
);
create index players_family_idx on public.players(family_id);

-- ---------------------------------------------------------------- word lists
create table public.word_lists (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  title text not null,
  week_start date not null,
  is_active boolean not null default false,
  -- reserved for the future "shared lists" feature: the list this one was imported from
  source_list_id uuid null references public.word_lists(id) on delete set null,
  created_at timestamptz not null default now()
);
create index word_lists_player_week_idx on public.word_lists(player_id, week_start desc);
create unique index word_lists_one_active_idx on public.word_lists(player_id) where is_active;

create table public.words (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.word_lists(id) on delete cascade,
  position int not null,
  text text not null,
  sentence text null,
  unique (list_id, position)
);
create index words_list_idx on public.words(list_id);

-- ---------------------------------------------------------------- games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  list_id uuid null references public.word_lists(id) on delete set null,
  mode text not null check (mode in ('weekly','practice','missed')),
  status text not null default 'in_progress' check (status in ('in_progress','complete')),
  warnings text[] not null default '{}',
  summary jsonb null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null
);
create index games_player_started_idx on public.games(player_id, started_at desc);

-- The words exactly as they were when the game started. source_word_id has NO foreign key on
-- purpose: editing or deleting a list must never change a finished game.
create table public.game_words (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  position int not null,
  text text not null,
  sentence text null,
  source text not null check (source in ('current','review')),
  source_word_id uuid null,
  outcome text null check (outcome in ('double','single','walk','strikeout')),
  unique (game_id, position)
);
create index game_words_game_idx on public.game_words(game_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  position int not null,
  attempt_number int not null check (attempt_number between 1 and 3),
  text text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (game_id, position, attempt_number)
);
create index attempts_game_idx on public.attempts(game_id);

-- ---------------------------------------------------------------- helpers
create or replace function public.my_family_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;

create or replace function public.my_player_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.players p
  join public.family_members m on m.family_id = p.family_id
  where m.user_id = auth.uid()
$$;

-- Every new auth user gets a family of their own.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  insert into public.families default values returning id into fid;
  insert into public.family_members (family_id, user_id) values (fid, new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Parent PIN: bcrypt via pgcrypto. Verified server-side so the hash never reaches the browser.
create or replace function public.set_parent_pin(pin text)
returns void
language sql security definer set search_path = public as $$
  update public.families set parent_pin_hash = crypt(pin, gen_salt('bf'))
  where id in (select public.my_family_ids())
$$;

create or replace function public.verify_parent_pin(pin text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select parent_pin_hash = crypt(pin, parent_pin_hash)
       from public.families where id in (select public.my_family_ids()) limit 1),
    false)
$$;

create or replace function public.has_parent_pin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select parent_pin_hash is not null from public.families
      where id in (select public.my_family_ids()) limit 1),
    false)
$$;

-- Idempotent attempt recording: a re-sent attempt is ignored, the outcome is written once.
-- SECURITY INVOKER (default): RLS on games/attempts/game_words applies to the caller.
create or replace function public.record_attempt(
  p_game_id uuid, p_position int, p_attempt_number int, p_text text, p_correct boolean, p_outcome text
) returns void
language plpgsql set search_path = public as $$
begin
  insert into public.attempts (game_id, position, attempt_number, text, correct)
  values (p_game_id, p_position, p_attempt_number, p_text, p_correct)
  on conflict (game_id, position, attempt_number) do nothing;
  if p_outcome is not null then
    update public.game_words set outcome = p_outcome
    where game_id = p_game_id and position = p_position and outcome is null;
  end if;
end $$;

-- Flip the active list atomically (the partial unique index forbids two actives at once).
create or replace function public.set_active_list(p_player_id uuid, p_list_id uuid)
returns void
language plpgsql set search_path = public as $$
begin
  update public.word_lists set is_active = false where player_id = p_player_id and is_active;
  update public.word_lists set is_active = true where id = p_list_id and player_id = p_player_id;
end $$;

-- Delete everything the signed-in parent owns, then the auth user itself.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.families where id in (select public.my_family_ids());
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.players enable row level security;
alter table public.word_lists enable row level security;
alter table public.words enable row level security;
alter table public.games enable row level security;
alter table public.game_words enable row level security;
alter table public.attempts enable row level security;

-- families and family_members are READ-ONLY for clients: rows are created by the sign-up trigger
-- and changed only through the SECURITY DEFINER functions above. A writable membership policy
-- would let a signed-in user insert themselves into any family whose id they learned.
create policy families_select on public.families
  for select using (id in (select public.my_family_ids()));

create policy family_members_select on public.family_members
  for select using (user_id = auth.uid());

create policy players_all on public.players
  for all using (family_id in (select public.my_family_ids()))
  with check (family_id in (select public.my_family_ids()));

create policy word_lists_all on public.word_lists
  for all using (player_id in (select public.my_player_ids()))
  with check (player_id in (select public.my_player_ids()));

create policy words_all on public.words
  for all using (list_id in (select id from public.word_lists where player_id in (select public.my_player_ids())))
  with check (list_id in (select id from public.word_lists where player_id in (select public.my_player_ids())));

create policy games_all on public.games
  for all using (player_id in (select public.my_player_ids()))
  with check (player_id in (select public.my_player_ids()));

create policy game_words_all on public.game_words
  for all using (game_id in (select id from public.games where player_id in (select public.my_player_ids())))
  with check (game_id in (select id from public.games where player_id in (select public.my_player_ids())));

create policy attempts_all on public.attempts
  for all using (game_id in (select id from public.games where player_id in (select public.my_player_ids())))
  with check (game_id in (select id from public.games where player_id in (select public.my_player_ids())));

-- Only signed-in users may call the RPCs. Postgres grants EXECUTE to PUBLIC on creation, so the
-- revoke must name PUBLIC as well as anon or it does nothing.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.my_family_ids(), public.my_player_ids(), public.set_parent_pin(text),
  public.verify_parent_pin(text), public.has_parent_pin(),
  public.record_attempt(uuid,int,int,text,boolean,text), public.set_active_list(uuid,uuid),
  public.delete_my_account() to authenticated;
