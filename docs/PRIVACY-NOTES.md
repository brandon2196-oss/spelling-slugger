# Privacy notes

Written for the parent running this app, not as legal advice. Verify before sharing widely.

## What the app collects
- **Parent:** email address and a password, stored only as a salted scrypt hash on the server.
  Optional 4-digit parent PIN, stored the same way.
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
- One family cannot read another family's data. The server scopes every database query to the
  signed-in parent's family; the browser never talks to the database and holds no key. An
  automated test (`server/src/app.test.ts`) checks this for every endpoint on every run.

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
The app runs as one service on Replit (an Autoscale deployment with a Replit-managed Postgres
database) under the site owner's own account. Replit publishes its own privacy and security
documentation; traffic is HTTPS and the database is encrypted at rest. Passwords and PINs are stored
only as salted hashes. There are no analytics and no third-party services beyond Google Fonts.
