alter table words add column if not exists difficulty text not null default 'medium'
  check (difficulty in ('easy','medium','hard'));
alter table words add column if not exists source text not null default 'current'
  check (source in ('current','review'));
alter table game_words add column if not exists difficulty text not null default 'medium'
  check (difficulty in ('easy','medium','hard'));
alter table game_words drop constraint if exists game_words_outcome_check;
alter table game_words add constraint game_words_outcome_check
  check (outcome in ('homeRun','double','single','walk','strikeout'));
