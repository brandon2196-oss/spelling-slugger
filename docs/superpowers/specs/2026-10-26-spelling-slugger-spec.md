# **BUILD SPECIFICATION: COOPER’S SPELLING SLUGGER**

## **Your Role**

Act as a senior full-stack software engineer, 2D game developer, educational game designer, database architect, and user experience designer.

Build a complete, production-ready, mobile-friendly baseball spelling game called **Cooper’s Spelling Slugger**.

This application is intended for elementary-school children to practice their weekly spelling words by playing an interactive baseball game.

The original player is Cooper, an 8-year-old left-handed baseball player. However, this application must support other families registering and creating their own customized players.

The application should feel like a real baseball video game, not a traditional spelling quiz with baseball decorations.

**This is a request to build a working application, not merely generate a design, prototype, or development plan.**

Inspect the existing development environment, determine the most suitable architecture, and implement the application.

Do not assume a particular AI app builder or hosting provider.

Ask for confirmation before installing major dependencies, provisioning paid services, or making irreversible changes.

---

# **1\. PRIMARY OBJECTIVE**

Create a baseball game where children earn hits and score runs by spelling words correctly.

Each week consists of:

* 15 new spelling words.  
* 5 randomly selected words from the immediately preceding week’s list.  
* 20 total spelling words per game.

The child listens to a word, types its spelling, and submits the entire word.

The number of attempts determines the baseball outcome.

| Spelling result | Baseball outcome |
| ----- | ----- |
| Correct on first attempt | Double |
| Correct on second attempt | Single |
| Correct on third attempt | Walk |
| Incorrect on all three attempts | Strikeout |

Every incorrect full-word submission counts as ONE strike, regardless of how many letters are wrong.

The objective is to score as many baseball runs as possible through the complete spelling list.

---

# **2\. APPLICATION PLATFORM**

Build a responsive web application that works on:

* iPhones using Safari.  
* Windows computers.  
* Mac computers.  
* iPads and other tablets.  
* Modern desktop browsers.

Implement Progressive Web App (PWA) functionality so families can add the game to their home screen.

Requirements:

* Touchscreen-friendly controls.  
* Physical keyboard support.  
* Mobile portrait and landscape layouts.  
* Fast loading.  
* Responsive animations.  
* Persistent cloud storage.  
* Secure parent accounts.  
* Saved game progress.  
* Synchronization across devices.  
* HTTPS deployment.  
* Installable app icons and manifest.

The application should not require App Store or Google Play distribution.

Use a modern, maintainable development stack suitable for the available environment.

A suggested architecture is React, TypeScript, Phaser for 2D gameplay, and a secure cloud database such as PostgreSQL through Supabase.

You may select a different stack if it better suits the development environment. Explain the decision briefly.

---

# **3\. MULTI-FAMILY ACCOUNTS**

This application must be shareable with other parents.

Each family should be able to visit the website, create an account, and use the game independently.

### **Parent Accounts**

Allow parents to:

* Register with email and password or another secure authentication method.  
* Sign in and sign out.  
* Recover account access.  
* Create multiple child profiles.  
* Enter spelling lists for each child.  
* Review each child’s progress.  
* Customize player settings.  
* Delete their account and associated data.

### **Data Privacy**

Each family must have completely separate private data.

One family must never access another family’s:

* Child profiles.  
* Spelling lists.  
* Game sessions.  
* Spelling attempts.  
* Scores.  
* Progress reports.  
* Account settings.

Use secure authorization and database row-level security or equivalent server-side access controls.

Do not rely solely on hiding information in the frontend.

Children must not need email addresses or separate online accounts.

Do not display public child profiles or publicly identifiable leaderboards.

Minimize collection of children’s personal information. Use nicknames or first names only, and do not collect birthdays, addresses, school names, or photos unless a future feature requires them and appropriate privacy safeguards are implemented.

Before public launch, identify any child privacy compliance requirements, including COPPA where applicable. Do not claim legal compliance without verification.

---

# **4\. MULTIPLE CHILDREN PER FAMILY**

A parent can create more than one child player.

Each child must have independent:

* Player customization.  
* Weekly spelling lists.  
* Review-word selection.  
* Game history.  
* Scores.  
* High scores.  
* Spelling statistics.  
* Practice sessions.  
* Missed-word tracking.

Create a simple player-selection screen.

A parent should be able to switch between children without logging out.

---

# **5\. PLAYER CUSTOMIZATION**

Allow every child to customize their baseball player.

Include:

* Player name.  
* Jersey number from 0 to 99\.  
* Team name.  
* Primary uniform color.  
* Secondary uniform color.  
* Jersey color.  
* Pants color.  
* Hat and helmet color.  
* Skin tone.  
* Hair color.  
* Hairstyle.  
* Batting handedness.  
* Optional avatar using built-in customization options.

### **Left-Handed and Right-Handed Batting**

Allow the player to select:

* Left-handed batter.  
* Right-handed batter.

This must change the actual in-game batting stance and swing animations.

A left-handed batter should stand in the first-base-side batter’s box, and a right-handed batter should stand in the third-base-side batter’s box, both facing the pitcher.

The bat, hands, stance, and swing must appear correct for the selected handedness.

Do not merely change a text label.

Provide a live preview of the customized player.

Save customization permanently and allow changes later.

### **Default Original Player**

Create the initial player with:

* Name: Cooper.  
* Batting: Left-handed.  
* Other customization options selected by the parent.

Do not hardcode Cooper’s identity into the general registration experience for other families.

The application may retain the name “Cooper’s Spelling Slugger” as its product branding.

---

# **6\. WEEKLY SPELLING WORD MANAGEMENT**

Create a parent dashboard for managing spelling words.

Each school week contains 15 current spelling words.

Allow parents to:

1. Enter words individually.  
2. Paste 15 words at once, separated by commas or line breaks.  
3. Edit and correct words.  
4. Automatically number the words.  
5. Save lists by week and start date.  
6. View previous weeks.  
7. Choose the active week.  
8. Revisit previous lists.  
9. Duplicate a list for editing.  
10. Delete lists with confirmation.

### **Weekly Review Words**

At the start of each new official game:

1. Retrieve the current week’s 15 words.  
2. Retrieve the immediately preceding school week’s list for that same child.  
3. Randomly select 5 distinct words from that previous list.  
4. Combine them with the current 15 words.  
5. Randomize the order of all 20 words.  
6. Save the exact selection for the game.

The five review words should change randomly between new games.

If no preceding week’s list exists, use the 15 current words.

If fewer than five unique eligible review words exist, use those available and explain the limitation to the parent.

Avoid repeating the same spelling word within a game. If overlapping current and review lists prevent a full 20-word set, notify the parent instead of silently inserting duplicates.

Do not pull from an older week if the immediately preceding week’s list is missing.

Store the actual word selections with the game session so historical results remain accurate even if a parent later edits a weekly list.

### **Spelling Word Types**

Support ordinary words and, where appropriate, words containing apostrophes or hyphens.

Preserve correct punctuation and capitalization for display.

Compare answers case-insensitively, while respecting required spelling and punctuation.

---

# **7\. SPELLING GAME INPUT**

The child must hear each spelling word spoken aloud without seeing the answer.

### **Audio**

Include:

* Hear Word.  
* Repeat Word.  
* Optional Hear It Slowly.  
* Optional Hear It in a Sentence, when a parent-provided sentence is available.  
* Adjustable volume or mute controls.

Use browser text-to-speech initially, with a reliable fallback if speech is unavailable.

Respect mobile browser audio restrictions.

Do not display the correct spelling while the at-bat is active.

### **Typing**

Provide a large spelling input field.

Allow:

* Touch keyboard on mobile.  
* Physical keyboard on desktop.  
* Submit button.  
* Enter key submission.  
* Clear Answer button.  
* Backspace and normal editing.

Disable spellcheck, autocomplete, autocorrect, and predictive suggestions where technically possible.

Do not provide letter hints or word-length hints during official games.

### **Answer Validation**

**Critical rule: Do not grade individual letters.**

Only evaluate the answer when the child submits the complete word.

Examples:

If the correct word is “baseball”:

* “basbal” \= one strike.  
* “basaball” \= one strike.  
* “bseball” \= one strike.

The number of incorrect letters does not matter.

Every submitted incorrect full word is exactly one strike.

Empty submissions should not count as strikes.

After an incorrect submission:

* Display the strike animation.  
* Increase the strike counter by one.  
* Clear the input.  
* Let the child try again, unless it was the third strike.

Do not reveal which letters were incorrect during the at-bat.

---

# **8\. OFFICIAL BASEBALL SPELLING RULES**

Each spelling word represents one at-bat.

There are a maximum of three spelling attempts per word.

### **First Attempt**

Correct spelling:

**DOUBLE**

* Award one double.  
* Count one hit.  
* Advance the batter to second base.  
* Advance existing baserunners two bases.  
* Score runners who cross home plate.  
* Play the double animation.

Incorrect spelling:

**STRIKE ONE**

* Count one strike.  
* Clear the answer.  
* Allow another attempt.

### **Second Attempt**

Correct spelling:

**SINGLE**

* Award one single.  
* Count one hit.  
* Advance the batter to first base.  
* Advance existing baserunners one base.  
* Score runners who cross home plate.  
* Play the single animation.

Incorrect spelling:

**STRIKE TWO**

* Count the second strike.  
* Clear the answer.  
* Allow one final attempt.

### **Third Attempt**

Correct spelling:

**WALK**

* Award one walk.  
* Do not count a hit.  
* Batter advances to first base.  
* Existing runners advance only when forced.  
* Score a run if a bases-loaded walk forces the runner on third home.  
* Play the walk animation.

Incorrect spelling:

**STRIKEOUT**

* Count the third strike.  
* Record one strikeout.  
* Record one out.  
* Do not advance runners.  
* Reveal the correct spelling.  
* Allow the child to hear the word again.  
* Continue to the next word.

### **Important**

Reset the strike count for every new word.

Do not award multiple baseball outcomes for one word.

Correct spelling on the third attempt is always a walk, never a single.

---

# **9\. BASEBALL FIELD AND GAMEPLAY**

Create a visually engaging baseball stadium with:

* Home plate.  
* First base.  
* Second base.  
* Third base.  
* Pitcher.  
* Batter.  
* Animated baserunners.  
* Baseball.  
* Scoreboard.  
* Infield and outfield.  
* Crowd or stadium background.

Track:

* Current inning.  
* Current at-bat.  
* Total words.  
* Words remaining.  
* Strikes.  
* Outs.  
* Runs.  
* Singles.  
* Doubles.  
* Walks.  
* Strikeouts.  
* Total hits.  
* Base occupancy.

### **Baserunning Rules**

**Single**

* Batter reaches first.  
* Existing runners advance exactly one base.  
* Any runner crossing home scores.

**Double**

* Batter reaches second.  
* Existing runners advance exactly two bases.  
* Any runner crossing home scores.

**Walk**

* Batter reaches first.  
* Only runners forced by occupied bases advance.  
* A runner on third scores only if forced home by a bases-loaded walk.

**Strikeout**

* Batter is out.  
* Existing runners remain where they are.

Use proper force-advance logic for all base configurations.

### **Inning Rules**

* Three outs end an inning.  
* Clear all occupied bases.  
* Reset outs to zero.  
* Advance to the next inning.  
* Continue playing until every spelling word has been attempted.

Do not impose a nine-inning limit.

The game is a single-team scoring challenge. There is no opponent’s batting turn.

### **Game Completion**

After the final word:

* Complete the current play.  
* Score only runners who actually cross home plate.  
* Do not award runs for runners left on base.  
* End the game.  
* Save results.  
* Display the final scoreboard.

The primary score is **total runs**.

---

# **10\. BASEBALL ANIMATIONS**

The game must visually resemble a polished 2D baseball video game.

Create:

* Animated batter and pitcher.  
* Baseball pitch animation.  
* Bat-swing animation.  
* Ball-contact animation.  
* Single animation.  
* Double animation.  
* Walk animation.  
* Strikeout animation.  
* Animated runners advancing around bases.  
* Run-scoring celebrations.  
* Inning transitions.  
* End-of-game celebration.

Display large, exciting announcements:

* DOUBLE\!  
* BASE HIT\!  
* STRIKE ONE\!  
* STRIKE TWO\!  
* STRIKE THREE\!  
* TAKE YOUR BASE\!  
* RUN SCORED\!  
* THREE OUTS\!  
* NEW INNING\!  
* GAME OVER\!

Add optional sound effects:

* Bat cracking.  
* Crowd cheering.  
* Umpire calls.  
* Stadium ambience.  
* Run-scoring celebrations.

Use original or properly licensed assets. Do not use copyrighted professional team logos, game artwork, or audio without permission.

The animation must match the actual game state.

Do not advance the game or allow duplicate submissions while a play animation is processing.

Make animations performant on mobile devices.

---

# **11\. GAME MODES**

### **Weekly Game**

Use the current week’s 15 words plus 5 random review words.

Save results to the weekly score history.

### **Practice Mode**

Allow children to practice any saved list.

Use the same baseball mechanics without affecting official weekly records.

### **Missed Words Practice**

Automatically assemble words previously missed or struck out on.

### **Replay Week**

Allow the child to replay the active week and attempt to beat their high score.

Randomize the word order and select a new random set of review words.

### **Previous Weeks**

Allow families to revisit historical spelling lists and play those weeks again.

Associate every result with the correct child and school week.

---

# **12\. GAME RESULTS**

At the end of a game, display:

* Final runs.  
* Total hits.  
* Singles.  
* Doubles.  
* Walks.  
* Strikeouts.  
* Total strikes.  
* First-attempt correct answers.  
* Second-attempt correct answers.  
* Third-attempt correct answers.  
* Completely missed words.  
* First-attempt accuracy percentage.  
* Current-week word performance.  
* Review-word performance.  
* Personal best.

Include buttons for:

* Play Again.  
* Practice Missed Words.  
* View Stats.  
* Return Home.

Celebrate a new personal best.

A walk must not count as a hit.

---

# **13\. PARENT PROGRESS DASHBOARD**

Create a detailed but easy-to-use parent dashboard.

Include:

* Saved weekly spelling lists.  
* Current active week.  
* Game history.  
* High scores.  
* Accuracy trends.  
* Weekly score trends.  
* First-attempt success rate.  
* Frequently missed words.  
* Consistently mastered words.  
* Review-word retention.  
* Total games played.  
* Total practice sessions.

Allow the parent to open any completed game and see:

* Each spelling word.  
* All submitted attempts.  
* Number of strikes.  
* Final baseball outcome.  
* Whether it was a current or review word.  
* Correct spelling.

Provide simple visual charts showing improvement.

Store individual attempts so the parent can distinguish between words that were almost correct and words that were completely missed.

---

# **14\. GAME SAVE AND RESUME**

Save game progress automatically after every completed at-bat.

If the browser closes, the page refreshes, or the child switches devices, allow the family to resume the unfinished game.

Persist:

* Selected words and their order.  
* Completed at-bats.  
* Current inning.  
* Outs.  
* Runs.  
* Base occupancy.  
* Hits.  
* Walks.  
* Strikeouts.  
* Current word index.  
* Current attempt and strike count.  
* Submitted answers.

Prevent duplicate scoring when reconnecting or resuming.

Use authoritative game-state validation to protect against accidental corruption or inconsistent scoring.

---

# **15\. SHARING WITH OTHER PARENTS**

The app must be accessible through a shareable HTTPS website address.

Include a Share App option.

Parents should be able to share the link through:

* Text messages.  
* Email.  
* Native phone sharing.  
* Copy Link.

When a new parent opens the link:

1. Show a welcome screen.  
2. Explain the game briefly.  
3. Allow them to register.  
4. Let them create their own child player.  
5. Allow player customization.  
6. Let them enter their own spelling list.  
7. Start their first game.

New families must not inherit Cooper’s spelling lists, scores, or customization.

The application should not include subscriptions, advertisements, or payments.

Avoid unnecessary operating costs, but clearly identify any hosting, database, or service expenses before deployment.

---

# **16\. OPTIONAL FUTURE FEATURE: SHARED SPELLING LISTS**

Design the database so a future version can support parents sharing spelling lists with other families.

For example, multiple students in the same class could import a weekly list rather than typing it separately.

This feature should eventually support:

* Parent-created shareable list links.  
* Importing a list into another child’s account.  
* Keeping game scores and progress private.  
* Allowing parents to edit their own imported copies.

Do not make this feature a prerequisite for the initial release.

---

# **17\. DESIGN AND USER EXPERIENCE**

The application should be fun, colorful, polished, and baseball-focused.

### **Child Interface**

Use:

* Large buttons.  
* Readable typography.  
* Baseball-themed graphics.  
* Simple navigation.  
* Minimal reading requirements.  
* Spoken instructions where helpful.  
* Clear feedback after each attempt.  
* Smooth transitions.  
* Accessible color contrast.

### **Parent Interface**

Use:

* Clean forms.  
* Easy word entry.  
* Clear weekly organization.  
* Readable statistics.  
* Simple account management.  
* Responsive layouts.

Keep the child gameplay screen separate from parent management functions.

Protect parent-only actions from accidental access by children.

Use a consistent design system.

---

# **18\. DATABASE DESIGN**

Create an appropriate normalized database schema.

Suggested entities:

* Parent users.  
* Family accounts.  
* Child player profiles.  
* Player customization.  
* Weekly spelling lists.  
* Spelling words.  
* Game sessions.  
* Game word selections.  
* Individual spelling attempts.  
* At-bat outcomes.  
* Saved game states.  
* Game results.

Each record must be correctly associated with its family and child.

Use secure authentication and authorization.

Implement database migrations and indexes as appropriate.

Ensure historical game results remain unchanged when word lists are edited.

---

# **19\. REQUIRED AUTOMATED TESTS**

Implement tests for the following:

1. First-attempt correct spelling awards a double.  
2. Second-attempt correct spelling awards a single.  
3. Third-attempt correct spelling awards a walk.  
4. Three incorrect submitted words cause a strikeout.  
5. Multiple incorrect letters in one submitted word count as one strike.  
6. No grading occurs before submission.  
7. Singles advance existing runners one base.  
8. Doubles advance existing runners two bases.  
9. Walks advance only forced runners.  
10. Bases-loaded walks score one run.  
11. Strikeouts do not advance runners.  
12. Three outs end an inning.  
13. Ending an inning clears the bases.  
14. The game continues until all words are attempted.  
15. Runners stranded at the end do not score.  
16. Fifteen current words and five unique review words are selected correctly.  
17. Review words come from the correct previous week and child.  
18. New games randomize the review selection.  
19. Historical game results preserve their original word selections.  
20. Left-handed batting animations display correctly.  
21. Right-handed batting animations display correctly.  
22. Separate families cannot access each other’s data.  
23. Siblings have independent lists and progress.  
24. Game progress survives browser refresh.  
25. Completed game results save accurately.  
26. Duplicate submissions cannot score twice.  
27. Audio pronunciation works on supported mobile and desktop browsers.  
28. Account registration and authentication work correctly.

Also test representative iPhone and desktop viewport sizes.

---

# **20\. DEVELOPMENT AND DELIVERY PLAN**

Implement the application in stages.

### **Phase 1 — Foundation**

* Set up the project.  
* Configure the database.  
* Implement parent authentication.  
* Create family and child profiles.  
* Implement player customization.  
* Create weekly spelling list management.

### **Phase 2 — Baseball Game Engine**

* Implement spelling submission.  
* Implement three-attempt scoring.  
* Implement strikeouts.  
* Implement singles, doubles, and walks.  
* Implement baserunning.  
* Implement innings.  
* Implement final scoring.  
* Write and run game engine tests.

### **Phase 3 — Playable Interface**

* Create the baseball field.  
* Implement spoken spelling prompts.  
* Create mobile and desktop input.  
* Connect the UI to the game engine.  
* Add game save and resume.

### **Phase 4 — Visual Game Experience**

* Add batter and pitcher animations.  
* Add left-handed and right-handed batting.  
* Add baserunner animations.  
* Add scoreboard.  
* Add stadium visuals.  
* Add sound effects and celebrations.

### **Phase 5 — Progress Tracking**

* Implement game history.  
* Implement high scores.  
* Implement parent statistics.  
* Implement missed-word practice.  
* Implement historical game replay.

### **Phase 6 — Sharing and Deployment**

* Configure secure production hosting.  
* Verify family data isolation.  
* Configure HTTPS.  
* Configure PWA support.  
* Test iPhone and desktop access.  
* Verify privacy and child-data safeguards.  
* Document deployment and ongoing costs.  
* Publish the shareable application.

Complete and test each phase before proceeding to the next.

---

# **21\. DEVELOPMENT REQUIREMENTS**

Use clean, maintainable, documented code.

Separate the game rules from the visual presentation.

Do not hardcode game outcomes into animations.

Use a deterministic game-state engine so scoring can be tested independently.

Use proper error handling.

Do not expose database credentials or private keys in frontend code.

Provide configuration instructions and an example environment file without real secrets.

Do not make unapproved purchases or deploy publicly without permission.

Avoid unnecessary paid services.

If a requested feature is technically difficult, explain the limitation and implement the best reliable solution without silently removing the feature.

Do not claim the application is production-ready until the relevant security, functionality, and deployment checks have passed.

---

# **22\. FINAL EXPECTATIONS**

Deliver:

1. Complete source code.  
2. A working baseball spelling game.  
3. Secure multi-family accounts.  
4. Customizable baseball players.  
5. Left- and right-handed batting animations.  
6. Weekly spelling list management.  
7. Automatic previous-week review selection.  
8. Correct baseball scoring and baserunning.  
9. Spoken spelling prompts.  
10. Game history and parent progress tracking.  
11. Mobile and desktop compatibility.  
12. Saved progress across devices.  
13. A shareable deployment.  
14. Automated tests.  
15. Clear setup and maintenance instructions.

The finished product should make children excited to practice spelling and give parents an easy way to manage and track their progress.

**Start by inspecting the available development tools and project environment. Then establish the project architecture and begin implementing Phase 1\. Do not stop after producing a plan.**

