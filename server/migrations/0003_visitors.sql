-- Phase 3 (fun-overhaul brief 6.3): additive, nullable, idempotent. Old games stay null and are left out of the season record.
alter table games add column if not exists result text check (result in ('win','loss'));
alter table games add column if not exists visitor_runs integer check (visitor_runs >= 0);
