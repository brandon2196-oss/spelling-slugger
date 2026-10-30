# Grand Slam Spelling — multi-kid + easy lists + private share

**Date:** 2026-10-28  
**Status:** Draft for Brandon review  
**Product rename:** Cooper's Spelling Slugger → **Grand Slam Spelling** (UI copy, titles, PWA name; repo may keep `spelling-slugger` for now)

## Goal

Make the app easy for Nicole and a few of her friends: one family login with several kids at different ages, a dead-simple weekly list flow (type 15 new words; auto-add 5 from last week), harder words worth more on a clean first try, and a private way to share the site without a public launch.

## Non-goals

- Photo / PDF import improvements (existing PDF path can stay; not the mom path for this release).
- Sharing kids or progress across families.
- Public discovery, app-store listing, or open signup marketing.
- Changing spelling rules beyond first-try hit value by difficulty (strikes, outs, innings stay).
- Merging friends into one shared account.

## Current baseline (keep)

- One parent account → one `family_id`; multiple `players` per family already exist.
- Word lists belong to a player; one active list per player.
- List editor already targets 15 words with paste support.
- Engine today: correct on try 1 = always double; try 2 = single; try 3 = walk; miss = strikeout. **No home run outcome yet.**

## Product decisions

| Topic | Decision |
| --- | --- |
| Name | **Grand Slam Spelling** |
| Friends | Each mom makes her **own** family login; Brandon texts an invite-only URL |
| Privacy | Unlisted URL + optional “disable new signups” later; no Google/public listing work in this pass |
| Siblings | Always **separate** weekly lists per kid |
| New words | Mom **types or pastes 15** |
| Review words | System adds **5 random** from that kid’s **previous week’s list** → play list of **20** |
| First week | No prior list → play the 15 only (or mom may add extra words manually up to 20) |
| Difficulty | Mom tags each of the **15 new** words Easy / Medium / Hard |
| Review-word difficulty | Default **Easy** (mom can change before save) |
| First-try hits | Easy → **single**, Medium → **double**, Hard → **home run** |
| Later tries | Unchanged ladder from today’s feel: try 2 = one tier down from that word’s first-try hit (HR→double, double→single, single→walk); try 3 = walk; miss = strikeout |

## UX

### Kid picker (home / after login)

- After login, show **all kids** for the family as large taps (name + jersey preview).
- Clear **Add sibling** action.
- Choosing a kid goes to that kid’s play home (unchanged modes: weekly / practice / missed).

### Parent zone — weekly list

1. Pick kid (or land from “this kid’s lists”).
2. **This week’s 15** — type one-by-one or paste; each row has Easy / Medium / Hard (default Medium).
3. On save (or “Build week”), show the **5 review** picks from last week (labeled “from last week”) with default Easy; mom can retag or swap if we expose simple replace — **v1: show them read-only with Easy**, retag allowed, no swap required.
4. Confirm → active list of 20 for that kid.

### Private share

- Primary: Brandon (or Nicole) sends `https://extrainningszip.replit.app` (or future Grand Slam domain) by text.
- Signup stays email/password as today.
- Optional follow-up (same release if cheap, else next): env/flag `ALLOW_REGISTRATION=false` after friends are in, so the link doesn’t grow new accounts.

### Rename surfaces

- Browser title, welcome screen, PWA `name` / `short_name`, apple-mobile title, README product name.
- Keep legal/privacy text accurate; don’t claim a new company.

## Data model changes

- `words.difficulty` — `easy | medium | hard`, NOT NULL, default `medium` for new rows.
- `words.source` — `new | review` (or boolean `is_review`) so UI can label review words and so re-roll logic knows which 15 were typed.
- Game snapshot (`game_words`) must copy difficulty at game start so mid-edit doesn’t change a live game.
- Tallies: add `homeRuns` (and keep singles/doubles). Outcome type gains `'homeRun'`.
- Bases: `advance(..., 'homeRun')` = advance all runners + batter by 4 (everyone scores appropriately); extend `advanceAll` with `n = 4`.

## Engine changes

- `outcomeForAttempt(n, difficulty)` replaces fixed try→hit map for correct answers.
- Results / scoreboard / postgame copy mention home runs.
- Audio / booth: Hard first-try HR should use existing homer / fanfare paths if any; otherwise map to current “big hit” SFX.

## Approach (implementation shape)

Single incremental release on a branch off `main` (after or beside audio-redo):

1. Rename copy to Grand Slam Spelling.  
2. Kid-picker polish + Add sibling discoverability.  
3. Difficulty on words + list editor tags + 15+5 build.  
4. Engine home run + difficulty-aware first try.  
5. Registration gate flag (optional).  
6. Docs / privacy note: private friend share, not a public product launch.

## Testing

- Unit: paste 15; build adds 5 distinct review words when prior week has ≥5; fewer than 5 prior → add all available; difficulty defaults; outcome matrix Easy/Med/Hard × try 1/2/3; HR clears the bases correctly.
- e2e: register → add two kids → list for kid A with difficulties → play sees 20 → first-try Hard is HR.
- Family isolation unchanged.

## Rollout

- Deploy to the existing Replit app for Nicole + friends only.
- Do **not** merge or market as public until Brandon says so.
- Audio-redo PR remains separate; this design does not depend on merging it first, but live listen QA can continue in parallel.

## Open follow-ups (out of scope unless Brandon asks)

- Custom domain branded Grand Slam Spelling.  
- Class-wide “share this week’s 15” import link.  
- Photo/PDF as primary entry again.  
- Per-friend invite codes with expiry.

## Done looks like

Nicole opens the app, picks Cooper or a sibling, parents type 15 tagged words, the week builds to 20, Hard words can leave the yard on the first try, and a friend can sign up from the link Brandon texts without finding the app on Google.
