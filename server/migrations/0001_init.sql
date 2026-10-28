-- Cooper's Spelling Slugger — schema for the self-hosted API.
-- One family per parent account. The API scopes every query to the signed-in user's family;
-- there is no row-level security here because the browser never talks to Postgres directly.
-- Every statement is IF NOT EXISTS: Replit's publish step may create these tables in the
-- production database before the server's own migration runner sees them.

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  parent_pin_hash text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_idx on users (lower(email));
create index if not exists users_family_idx on users(family_id);

-- Opaque session tokens: only the SHA-256 of the cookie value is stored.
create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null check (length(name) between 1 and 30),
  team_name text not null default '',
  jersey_number int not null check (jersey_number between 0 and 99),
  batting_hand text not null check (batting_hand in ('L','R')),
  appearance jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists players_family_idx on players(family_id);

create table if not exists word_lists (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  title text not null,
  week_start date not null,
  is_active boolean not null default false,
  source_list_id uuid null references word_lists(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists word_lists_player_week_idx on word_lists(player_id, week_start desc);
create unique index if not exists word_lists_one_active_idx on word_lists(player_id) where is_active;

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references word_lists(id) on delete cascade,
  position int not null,
  text text not null,
  sentence text null,
  unique (list_id, position)
);
create index if not exists words_list_idx on words(list_id);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  list_id uuid null references word_lists(id) on delete set null,
  mode text not null check (mode in ('weekly','practice','missed')),
  status text not null default 'in_progress' check (status in ('in_progress','complete')),
  warnings text[] not null default '{}',
  summary jsonb null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null
);
create index if not exists games_player_started_idx on games(player_id, started_at desc);

-- The words exactly as they were when the game started. source_word_id has NO foreign key on
-- purpose: editing or deleting a list must never change a finished game.
create table if not exists game_words (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  position int not null,
  text text not null,
  sentence text null,
  source text not null check (source in ('current','review')),
  source_word_id uuid null,
  outcome text null check (outcome in ('double','single','walk','strikeout')),
  unique (game_id, position)
);
create index if not exists game_words_game_idx on game_words(game_id);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  position int not null,
  attempt_number int not null check (attempt_number between 1 and 3),
  text text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (game_id, position, attempt_number)
);
create index if not exists attempts_game_idx on attempts(game_id);
