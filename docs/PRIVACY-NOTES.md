# Privacy notes

Written for the parent running this app, not as legal advice. Verify before sharing widely.

## What the app collects
- **Parent:** email address and a password (hashed by Supabase; the app never sees it). Optional
  4-digit parent PIN, stored as a bcrypt hash.
- **Child:** a first name or nickname, a team name, a jersey number, and avatar colors chosen from a
  fixed palette. No birthday, school, photo, address, or email.
- **Gameplay:** the word lists a parent types or imports, every spelling attempt a child submits,
  and the resulting scores. This is the product: it is what the progress reports are made of.
- **Imported PDFs:** the teacher's PDF is read inside the browser and never uploaded. Only the words
  the parent confirms are saved; the file itself is discarded.
- **Device:** audio settings and the current parent-zone unlock live only in the browser
  (localStorage / sessionStorage). No analytics, no advertising identifiers, no third-party scripts
  other than Google Fonts.

## What the app does not do
- No ads, no payments, no subscriptions, no selling or sharing of data.
- Children never create accounts, never enter an email, and are never shown to other families.
  There is no public profile or leaderboard.
- One family cannot read another family's data. Postgres row-level security enforces this on the
  server for every table; the frontend has no privileged key.

## COPPA, in plain terms
COPPA governs online collection of personal information from children under 13. The posture here:
- The **parent** is the account holder and enters all data; the child has no account and provides
  nothing but typed spelling attempts.
- The child's first name is the only child-related identifier, and it is visible only to that family.
- Nothing is disclosed to third parties, and there is no behavioral advertising.

This is the shape of a service a parent operates for their own child, which is far from the cases
COPPA is aimed at. It is **not** a legal determination. Before promoting this beyond friends and
family, consider: a short privacy policy page linked from the welcome screen (what is collected,
how to delete it), and confirming with someone qualified whether verifiable parental consent
procedures apply to a parent-operated tool like this one.

## Deleting data
Account → Delete account removes the family, every child, list, game and attempt, and the parent's
login, in one transaction. Deleting a single player removes everything under that player.

## Hosting
Supabase (database and auth) and Vercel (static hosting) process the data. Both publish their own
privacy and security documentation; the free tiers used here include encryption in transit (HTTPS)
and at rest.
