# Grand Slam Spelling art: Nano Banana prompt pack

Paste these into Gemini (Nano Banana image model) in the order given. Each prompt says which file the output becomes. File names and sizes match section 3 of the fun overhaul brief, so the bots can drop the results straight into `public/art/`.

## Part A: how to work in Nano Banana so the output is usable

1. **One chat per subject.** One chat for the style sheet, one for the stadium, one for the batter, one for the pitcher, one for the fielders, one for catcher and umpire, one for the crowd, one for the booth portraits, one for the chrome. Nano Banana keeps a character consistent inside a chat, not across chats.
2. **Generate the style sheet first and upload it into every other chat** as the first message with the words "Match this style exactly." Nicole approves the style sheet before you make anything else.
3. **Solid green background, always.** Nano Banana does not output transparency. Every prompt below asks for a flat `#00FF00` background. The bots key the green out. Never let the character wear green.
4. **Chroma-key colors on the kid's batter only.** The game recolors the batter to the kid's chosen jersey, pants, hat, skin and hair. So the batter is drawn in placeholder colors the bots split into layers:

   | Part | Color to ask for | Hex |
   | --- | --- | --- |
   | jersey body | magenta | `#FF00FF` |
   | pants | cyan | `#00FFFF` |
   | cap crown | yellow | `#FFFF00` |
   | cap brim | orange | `#FF8000` |
   | sleeves, collar, socks, stripes | blue | `#0000FF` |
   | skin | red | `#FF0000` |
   | hair | purple | `#8000FF` |
   | outlines | black | `#000000` |
   | shoes | dark gray | `#333333` |
   | bat | wood brown | `#A0522D` |
   | batting gloves | white | `#FFFFFF` |

   Shading is allowed as a darker shade of the same color. No other colors anywhere on the batter. Everyone else (pitcher, fielders, catcher, umpire) is drawn in normal colors.
5. **Sprite sheets as one image.** For animation, ask for one image with all frames in a single row of equal cells. Say the cell count and that the feet sit on the same baseline in every cell. If a frame drifts, reply "Redo frame 5 only, keep everything else identical."
6. **Highest resolution the model offers**, 2K wide for sprite rows, 4K for the stadium. Landscape for rows and stadium, square for portraits.
7. **No text, no logos, no watermark** in any image. The model likes to add them; the prompts say no, and you reject any image that has them.
8. **When a result is close but wrong, edit, do not regenerate.** "Same image, make the head 20 percent bigger." Editing keeps the character; a fresh generation does not.
9. **Save every accepted image with the file name shown** and put it in the folder shown. Keep the originals in `art-src/` and let the bots make the game-ready versions.

## Part B: the prompts

### B1. Style sheet (make this first, one chat)

File: `art-src/style-sheet.png`

```
A character design style sheet for a kids' baseball video game. Clean modern cartoon style: thick black outlines, flat colors with one darker shade for shadow, no gradients, no texture, bright and friendly. Characters have big heads, short bodies, oversized hands and bats, simple dot eyes and a small mouth. Show a front view, side view and three-quarter view of one child baseball player in a plain white uniform with red trim and a navy cap, standing in a batting stance. Beside them show a small color palette: navy #142850, red #D7263D, gold #F5B700, cream #FFFAF0, a bright daytime sky blue and a fresh light grass green. Flat solid #00FF00 background. No text, no logos, no watermark.
```

Follow-up edits to use until Nicole likes it: "Make the outlines thicker." "Make the head bigger." "Make the face friendlier." "Less detail on the uniform."

### B2. Stadium (one chat, upload the style sheet first)

Camera for every stadium image: from high behind home plate looking out toward center field, the full diamond visible, like a TV broadcast wide shot. Daytime.

**B2.1 Full empty stadium (the master)**
File: `art-src/stadium/full.png`

```
Match this style exactly. A wide shot of an empty cartoon baseball stadium from high behind home plate looking out to center field, daytime. Bright blue sky with two light towers, a green outfield wall with a blank dark scoreboard panel in center field, packed colorful stands behind the wall, fresh light green grass with mown stripes, a brown dirt infield with a pitcher's mound, home plate, three white bases, white foul lines and batter's boxes, an on-deck circle, and a near dugout railing along the bottom edge. No people, no players, no mascots. Thick black outlines, flat colors, no gradients. 4K, landscape 4:3. No text, no logos, no watermark.
```

Then, in the same chat, make each layer by editing the master. Say each one exactly:

**B2.2** File: `public/art/stadium/sky.png`
```
Same image, same camera. Show only the sky and the two light towers. Everything else is flat solid #00FF00.
```

**B2.3** File: `public/art/stadium/outfield-wall.png`
```
Same image, same camera. Show only the outfield wall and its blank scoreboard panel. Everything else is flat solid #00FF00.
```

**B2.4** File: `public/art/stadium/stands-far.png`
```
Same image, same camera. Show only the stands behind the outfield wall, with the crowd as simple colored shapes. Everything else is flat solid #00FF00.
```

**B2.5** File: `public/art/stadium/grass.png`
```
Same image, same camera. Show only the grass with its mown stripes, outfield and infield grass together. Everything else is flat solid #00FF00.
```

**B2.6** File: `public/art/stadium/dirt.png`
```
Same image, same camera. Show only the dirt: infield skin, pitcher's mound, batter's boxes area and baselines. Everything else is flat solid #00FF00.
```

**B2.7** File: `public/art/stadium/chalk.png`
```
Same image, same camera. Show only the white chalk lines: foul lines, batter's boxes, on-deck circle. Everything else is flat solid #00FF00.
```

**B2.8** File: `public/art/stadium/bases.png`
```
Same image, same camera. Show only home plate and the three bases. Everything else is flat solid #00FF00.
```

**B2.9** File: `public/art/stadium/dugout-near.png`
```
Same image, same camera. Show only the near dugout railing along the bottom edge. Everything else is flat solid #00FF00.
```

**B2.10** (optional) File: `public/art/stadium/foreground-fence.png`
```
Same image, same camera. Show only a thin protective netting strip along the very bottom edge. Everything else is flat solid #00FF00.
```

If a layer edit drifts from the master (the wall moves, the diamond changes shape), reject it and say "That moved. Keep every shape exactly where it is in the first image." If it keeps drifting, skip the layers and give the bots only the master; they can slice it into bands.

**B2.11 Night variant (optional, skip for launch)**
```
Same image, same camera, at night: dark blue sky, light towers switched on, stadium lit.
```

### B3. The kid's batter

> Facing (fixed 2026-10-31, see `facing-handoff.md`): stance, swings, take-walk, slump and hair face RIGHT toward the mound. run and trot stay LEFT-facing; code flips them per leg.
 (one chat, upload the style sheet first)

Every batter prompt starts with this block. Paste it each time:

```
Match this style exactly. A child baseball player, big head, short body, right-handed batting stance, drawn in placeholder colors only: jersey magenta #FF00FF, pants cyan #00FFFF, cap crown yellow #FFFF00, cap brim orange #FF8000, sleeves collar socks and stripes blue #0000FF, skin red #FF0000, hair purple #8000FF, shoes dark gray, wooden bat, white batting gloves. Shading only as a darker shade of the same color. Thick black outlines, flat fills, no gradients, no green anywhere on the character. Flat solid #00FF00 background. No text, no logos, no watermark.
```

**B3.1 Turnaround (make this first, keep it as the reference)**
File: `art-src/batter/turnaround.png`
```
[block] Show the same character four times in a row: front view, three-quarter view, side view, back view, standing relaxed holding the bat. Same size, feet on the same baseline.
```

**B3.2** File: `art-src/batter/stance-idle.png` (4 cells)
```
[block] A sprite sheet of 4 frames in one row, equal square cells, side view facing right toward the pitcher's mound (right-handed batter standing in the left batter's box, as seen from behind home plate), batting stance. Lefties are mirrored in code; never draw a lefty. The only motion is a small bat waggle: bat up, bat slightly back, bat up, bat slightly forward. Feet on the same baseline in every cell, body in the same place. 2K wide.
```

**B3.3** File: `art-src/batter/swing-miss.png` (8 cells)
```
[block] A sprite sheet of 8 frames in one row, equal square cells, side view facing right, same facing as stance-idle: a full baseball swing that misses. Frame 1 stance, 2 load back, 3 stride, 4 bat starts forward, 5 bat level at the plate, 6 bat past the plate, 7 bat wrapped around the back, 8 off balance follow-through. Feet on the same baseline in every cell. 2K wide.
```

**B3.4** File: `art-src/batter/swing-contact.png` (8 cells)
```
[block] A sprite sheet of 8 frames in one row, equal square cells, side view facing right, same facing as stance-idle: a full baseball swing that connects. Frames 1 to 3 same as a swing, frame 4 the bat meets a white ball at the plate with a small impact star, frame 5 the ball leaves to the upper right and the bat continues, 6 and 7 follow-through, 8 first running step toward the right. Feet on the same baseline in every cell. 2K wide.
```

**B3.5** File: `art-src/batter/take-walk.png` (6 cells)
```
[block] A sprite sheet of 6 frames in one row, equal square cells, side view facing right, same facing as stance-idle: the batter drops the bat and begins a relaxed jog to the right. Frame 1 stance, 2 bat lowered, 3 bat on the ground, 4 to 6 jog cycle. Feet on the same baseline. 2K wide.
```

**B3.6** File: `art-src/batter/run.png` (6 cells)
```
[block] A sprite sheet of 6 frames in one row, equal square cells, side view facing LEFT (keep left: code flips it on rightward legs home to first and first to second): a looping run cycle, no bat, arms pumping. Frame 6 flows back into frame 1. Feet on the same baseline. 2K wide.
```

**B3.7** File: `art-src/batter/trot.png` (6 cells)
```
[block] A sprite sheet of 6 frames in one row, equal square cells, side view facing LEFT (keep left: code flips it on rightward legs): a slow happy home-run trot, no bat, one fist raised. Loops. Feet on the same baseline. 2K wide.
```

**B3.8** File: `art-src/batter/strikeout-slump.png` (4 cells)
```
[block] A sprite sheet of 4 frames in one row, equal square cells, side view facing right, same facing as stance-idle: after a strikeout, shoulders drop, head tilts down, bat hangs, then holds still. Not crying, just disappointed. Feet on the same baseline. 2K wide.
```

**B3.9** File: `art-src/batter/celebrate.png` (6 cells)
```
[block] A sprite sheet of 6 frames in one row, equal square cells, front view: a jump and fist pump celebration, no bat, big smile. Frame 1 crouch, 2 and 3 in the air, 4 landing, 5 and 6 fist pump. Same baseline. 2K wide.
```

**B3.10 Hair overlays** (4 images)
Files: `art-src/batter/hair-short.png`, `hair-long.png`, `hair-curly.png`, `hair-buzz.png`
```
[block] Show the character's head only, side view facing right (matching stance-idle), the same head as the turnaround, bald, wearing the cap, with the hair drawn as a separate shape in purple #8000FF around the cap edge. Four versions in one row: short hair, long hair to the shoulders, curly hair, buzz cut. Same head position in every cell. 2K wide.
```

### B4. Pitcher (one chat, upload the style sheet first)

Block for every pitcher prompt:
```
Match this style exactly. A cartoon baseball pitcher on the visiting team, big head, short body, plain gray uniform with black trim and a black cap, brown glove, normal skin and hair colors, thick black outlines, flat fills. Flat solid #00FF00 background. No text, no logos, no watermark.
```

**B4.1** File: `art-src/pitcher/pitcher-idle.png` (4 cells)
```
[block] A sprite sheet of 4 frames in one row, equal square cells, front view facing the camera as seen from behind home plate: standing on the mound, ball in glove, small breathing motion. Same baseline. 2K wide.
```

**B4.2** File: `art-src/pitcher/pitcher-windup-throw.png` (10 cells)
```
[block] A sprite sheet of 10 frames in one row, equal square cells, front view: full windup and throw toward the camera. Frames 1 to 3 hands up and leg lift, 4 to 6 stride and arm back, 7 release with the ball leaving toward the viewer, 8 to 10 follow-through. Same baseline. 2K wide.
```

**B4.3** File: `art-src/pitcher/pitcher-react-hit.png` (4 cells)
```
[block] A sprite sheet of 4 frames in one row, equal square cells, front view: the pitcher turns to watch a ball fly over his head, hands on hips by the last frame. Same baseline. 2K wide.
```

### B5. Fielders

> Facing (fixed 2026-10-31): the camera is behind home plate, so fielders must face the CAMERA (front three-quarter). The old back three-quarter art is wrong and cannot be flipped in code. Only watch-hr stays a back view.
 (one chat, upload the style sheet first)

Block:
```
Match this style exactly. Two cartoon baseball fielders on the visiting team, one tall and thin, one short and stocky, plain gray uniform with black trim and black cap, brown gloves, normal skin and hair colors, thick black outlines, flat fills. Flat solid #00FF00 background. No text, no logos, no watermark.
```

**B5.1** File: `art-src/fielders/fielder-idle.png` (4 cells, both bodies)
```
[block] A sprite sheet with 2 rows of 4 equal square cells, top row the tall fielder, bottom row the stocky fielder, front three-quarter view facing the camera, as seen from behind home plate (the fielder looks toward home plate and the viewer; we see the face and chest, never the back): ready stance, knees bent, small bounce. Same baseline per row. 2K wide.
```

**B5.2** File: `art-src/fielders/fielder-chase.png` (6 cells, both bodies)
```
[block] A sprite sheet with 2 rows of 6 equal square cells, top row tall, bottom row stocky, front three-quarter view facing the camera, as seen from behind home plate: a looping run sideways toward the viewer chasing a ball, face visible, glove out. Same baseline per row. 2K wide.
```

**B5.3** File: `art-src/fielders/fielder-catch.png` (6 cells, both bodies)
```
[block] A sprite sheet with 2 rows of 6 equal square cells, top row tall, bottom row stocky, front three-quarter view facing the camera, as seen from behind home plate: the fielder reaches up and catches a ball in the glove, then holds it up. Same baseline per row. 2K wide.
```

**B5.4** File: `art-src/fielders/fielder-watch-hr.png` (4 cells, both bodies)
```
[block] A sprite sheet with 2 rows of 4 equal square cells, top row tall, bottom row stocky, back view (the one fielder clip that stays a back view: the fielder has turned around to watch the ball leave): the fielder looks up and back, watching a ball sail over the wall, shoulders slump by the last frame. Same baseline per row. 2K wide.
```

### B6. Catcher and umpire (one chat, upload the style sheet first)

Block:
```
Match this style exactly. A cartoon baseball catcher in gray visiting-team gear with black chest protector, shin guards and a catcher's mask, and a cartoon umpire in a navy shirt, gray pants and a black cap with a chest protector. Big heads, short bodies, thick black outlines, flat fills, normal skin colors. Flat solid #00FF00 background. No text, no logos, no watermark.
```

**B6.1** File: `art-src/catcher-ump/catcher-idle.png` (2 cells)
```
[block] A sprite sheet of 2 frames in one row, equal square cells, back view of the catcher crouched behind the plate as seen from behind home plate, glove up as a target, small shift between frames. Same baseline. 2K wide.
```

**B6.2** File: `art-src/catcher-ump/catcher-receive.png` (4 cells)
```
[block] A sprite sheet of 4 frames in one row, equal square cells, back view of the crouched catcher: the glove closes on a ball with a small pop mark, then returns to the target position. Same baseline. 2K wide.
```

**B6.3** File: `art-src/catcher-ump/ump-idle.png` (2 cells)
```
[block] A sprite sheet of 2 frames in one row, equal square cells, back view of the umpire standing behind the catcher, hands on knees, small shift between frames. Same baseline. 2K wide.
```

**B6.4** File: `art-src/catcher-ump/ump-strike.png` (4 cells)
```
[block] A sprite sheet of 4 frames in one row, equal square cells, back three-quarter view of the umpire: rises from the crouch and points to the side with one arm for a strike call, then returns. Same baseline. 2K wide.
```

**B6.5** File: `art-src/catcher-ump/ump-punchout.png` (6 cells)
```
[block] A sprite sheet of 6 frames in one row, equal square cells, back three-quarter view of the umpire: a big dramatic strike-three punch-out, winding the arm back and punching to the side, then holding. Same baseline. 2K wide.
```

### B7. Ball and shadow (same chat as the pitcher is fine)

**B7.1** File: `art-src/ball/ball.png`
```
Match this style exactly. A single cartoon baseball, white with red stitching, thick black outline, flat fill with one shade of shadow, centered, on a flat solid #00FF00 background. Square image. No text.
```

**B7.2** File: `art-src/ball/ball-spin.png` (3 cells)
```
Same ball, a sprite sheet of 3 frames in one row, equal square cells, the stitching rotated 0, 60 and 120 degrees. Same size and position in every cell.
```

**B7.3** File: `art-src/ball/ball-shadow.png`
```
A soft flat dark gray ellipse, like a ball's shadow on grass, no outline, centered on a flat solid #00FF00 background. Square image.
```

### B8. Crowd rows (one chat, upload the style sheet first)

Block:
```
Match this style exactly. A horizontal strip of cartoon baseball fans seated in stadium rows, seen from the front, simple shapes, varied bright shirt colors and skin tones, some with caps, some with foam fingers, big heads, no faces more detailed than dot eyes and a small mouth. The strip must tile seamlessly left to right: the left edge continues the right edge. Thick black outlines, flat fills. Flat solid #00FF00 background above and between fans. No text, no logos, no watermark. Very wide landscape image.
```

**B8.1** File: `art-src/crowd/row1-idle.png` (2 cells stacked)
```
[block] Two versions stacked vertically, each a full tileable strip of the nearest, most detailed row: version 1 fans seated calmly, version 2 the same fans shifted slightly as if breathing. Same fans in the same seats.
```

**B8.2** File: `art-src/crowd/row1-cheer.png` (4 cells stacked)
```
[block] Four versions stacked vertically of the same nearest row, a cheering loop: arms starting to rise, arms up, arms highest with mouths open, arms coming down. Same fans in the same seats.
```

**B8.3** and **B8.4** Repeat B8.1 and B8.2 for `row2` with "a middle row, smaller and a little less detailed" and for `row3` with "the far row, smallest, almost silhouettes with color".

### B9. Booth portraits (one chat, upload the style sheet first)

**B9.1** File: `art-src/booth/bigRed-mouth-closed.png` and `bigRed-mouth-open.png`
```
Match this style exactly. A head and shoulders portrait of an original cartoon baseball radio announcer named Big Red Brannigan: a big friendly man in his sixties with a round red face, thick red mustache, red hair under a flat cap, headset with a microphone, bow tie, wide grin. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos. Two versions: mouth closed, then the identical image with the mouth open mid-word.
```

**B9.2** File: `art-src/booth/jackDalton-mouth-closed.png` and `jackDalton-mouth-open.png`
```
Match this style exactly. A head and shoulders portrait of an original cartoon baseball announcer named Jack Dalton: a calm man in his forties, dark skin, short black hair, neat beard, purple cap, headset with a microphone, open collar shirt, small confident smile. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos. Two versions: mouth closed, then the identical image with the mouth open mid-word.
```

Big Red and Jack are original characters. Reject anything that looks like a real announcer.

### B10. On-screen chrome concepts (one chat, upload the style sheet first)

These are concepts the bots redraw as SVG, so they only need to look right, not be pixel perfect.

**B10.1** File: `art-src/chrome/score-bug.png`
```
Match this style exactly. A TV broadcast score bug for a kids' baseball video game: a rounded navy #142850 panel with gold #F5B700 edges showing two team rows labeled HOME and VISITORS with run totals, a small inning box, three out dots, three strike dots, and a word counter box. Chunky friendly rounded typography, thick outlines, flat colors. Landscape, flat solid #00FF00 background around the panel.
```

**B10.2** File: `art-src/chrome/caption-bar.png`
```
Match this style exactly. A broadcast caption bar: a long rounded dark navy strip with a gold left tab and a small announcer portrait slot on the left, room for one line of text. Thick outlines, flat colors. Very wide landscape, flat solid #00FF00 background.
```

**B10.3** File: `art-src/chrome/banners.png`
```
Match this style exactly. A sheet of chunky cartoon banner word treatments for a baseball game, each as thick gold letters with a navy outline and a small drop shadow, in a bouncy rounded game font, one per row: STRIKE ONE, STRIKE TWO, STRIKE THREE, BALL FOUR, BASE HIT, DOUBLE, HOME RUN, RUN SCORED, 2 RUNS SCORED, THREE OUTS, NEW INNING, GAME OVER, WALK-OFF, YOU WIN, TOUGH LOSS, HIGHLIGHT. Flat solid #00FF00 background.
```

**B10.4** File: `art-src/chrome/frame.png`
```
Match this style exactly. The four rounded corners of a retro TV broadcast frame in navy with gold trim, plus a small red ON AIR tag with a white dot, arranged on a flat solid #00FF00 background. Thick outlines, flat colors.
```

### B11. Mascot (optional, skip for launch)

Block and three sheets, same pattern as the pitcher: an original fuzzy gold mascot in a Slammers jersey, `mascot-idle` 4 cells, `mascot-happy` 4 cells, `mascot-sad` 4 cells.

## Part C: reject an image if

- It has any text, logo, watermark or signature.
- The background is not flat `#00FF00` (gradients, shadows on the ground, or a different green).
- The character wears green anywhere.
- A sprite row has cells of different sizes, or the feet move up or down between cells.
- The batter uses any color outside the chroma table, or mixes colors inside one part.
- The style drifted from the style sheet (thinner lines, gradients, realistic shading, smaller head).
- It looks like a real team, player, announcer or mascot.

## Part D: what to do with the files

1. Put accepted originals under `art-src/` with the exact names above. Keep this folder; it is the master.
2. Give the bots the `art-src/` folder. They key out the green, split the batter's chroma colors into the tint layers, cut sprite rows into frames, resize to the contract sizes, pack the atlases, and fill `public/art/manifest.json`.
3. The brief in PR 10 needs one short amendment so the bots expect this: section 3.3 gains a "chroma-key delivery" option with the color table from Part A. Say the word and that gets added.

### B10. Menu booth portraits (one chat, upload the style sheet first)

Used on the kid home "In the booth tonight" row. Square, friendly, waving from the broadcast booth window. Brandon generates these; bots never do.

**B10.1** File: `art-src/booth/menu-bigRed.png`
```
Match this style exactly. Cartoon baseball radio announcer Big Red Brannigan leaning out of a little stadium broadcast booth window, waving at the viewer: big friendly man in his sixties, round red face, thick red mustache, red hair under a flat cap, headset with microphone, bow tie, wide grin. Booth window frame in navy and gold. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos.
```

**B10.2** File: `art-src/booth/menu-jackDalton.png`
```
Match this style exactly. Cartoon baseball announcer Jack Dalton leaning on the sill of a little stadium broadcast booth window, giving a thumbs up: calm man in his forties, dark skin, short black hair, neat beard, purple cap, headset with microphone, open collar shirt, small confident smile. Booth window frame in navy and gold. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos.
```

**B10.3** File: `art-src/booth/menu-quiet.png`
```
Match this style exactly. An empty cartoon stadium broadcast booth window at night, microphone on its stand with a small "off" switch, headset hanging on a hook, navy and gold frame. Thick black outlines, flat fills. Square image, flat solid #00FF00 background. No text, no logos, no people.
```

Big Red and Jack are original characters. Reject anything that looks like a real announcer.
