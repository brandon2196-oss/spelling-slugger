# Facing fix: regenerate fielders and batter

Bots do not generate art. Brandon makes these in Nano Banana (upload the B1 style sheet first, one chat per group), saves the files at the paths below, and a bot packs them (`npm run pack-art`) and opens an art PR.

Why: the camera is behind home plate looking out. Fielders were drawn from behind (back three-quarter), so they show their backs to the plate; flipping cannot fix a back view. The batter stance was drawn facing the camera/left instead of toward the mound. Catcher and umpire (B6, back view) are already correct. Runners are fixed in code (run/trot art faces left; code flips on rightward legs).

## Fielders (one chat). Paste each prompt with `[block]` replaced by the block

Block:
```
Match this style exactly. Two cartoon baseball fielders on the visiting team, one tall and thin, one short and stocky, plain gray uniform with black trim and black cap, brown gloves, normal skin and hair colors, thick black outlines, flat fills. Flat solid #00FF00 background. No text, no logos, no watermark.
```

**B5.1** save to `art-src/fielders/fielder-idle.png`
```
[block] A sprite sheet with 2 rows of 4 equal square cells, top row the tall fielder, bottom row the stocky fielder, front three-quarter view facing the camera, as seen from behind home plate (the fielder looks toward home plate and the viewer; we see the face and chest, never the back): ready stance, knees bent, small bounce. Same baseline per row. 2K wide.
```

**B5.2** save to `art-src/fielders/fielder-chase.png`
```
[block] A sprite sheet with 2 rows of 6 equal square cells, top row tall, bottom row stocky, front three-quarter view facing the camera, as seen from behind home plate: a looping run sideways toward the viewer chasing a ball, face visible, glove out. Same baseline per row. 2K wide.
```

**B5.3** save to `art-src/fielders/fielder-catch.png`
```
[block] A sprite sheet with 2 rows of 6 equal square cells, top row tall, bottom row stocky, front three-quarter view facing the camera, as seen from behind home plate: the fielder reaches up and catches a ball in the glove, then holds it up. Same baseline per row. 2K wide.
```

`fielder-watch-hr.png` (B5.4) stays a back view; keep the current file.

## Batter (one chat, upload `art-src/batter/turnaround.png` too)

Block:
```
Match this style exactly. A child baseball player, big head, short body, right-handed batting stance, drawn in placeholder colors only: jersey magenta #FF00FF, pants cyan #00FFFF, cap crown yellow #FFFF00, cap brim orange #FF8000, sleeves collar socks and stripes blue #0000FF, skin red #FF0000, hair purple #8000FF, shoes dark gray, wooden bat, white batting gloves. Shading only as a darker shade of the same color. Thick black outlines, flat fills, no gradients, no green anywhere on the character. Flat solid #00FF00 background. No text, no logos, no watermark.
```

**B3.2** save to `art-src/batter/stance-idle.png`
```
[block] A sprite sheet of 4 frames in one row, equal square cells, side view facing right toward the pitcher's mound (right-handed batter standing in the left batter's box, as seen from behind home plate), batting stance. Lefties are mirrored in code; never draw a lefty. The only motion is a small bat waggle: bat up, bat slightly back, bat up, bat slightly forward. Feet on the same baseline in every cell, body in the same place. 2K wide.
```

**B3.3** save to `art-src/batter/swing-miss.png`
```
[block] A sprite sheet of 8 frames in one row, equal square cells, side view facing right, same facing as stance-idle: a full baseball swing that misses. Frame 1 stance, 2 load back, 3 stride, 4 bat starts forward, 5 bat level at the plate, 6 bat past the plate, 7 bat wrapped around the back, 8 off balance follow-through. Feet on the same baseline in every cell. 2K wide.
```

**B3.4** save to `art-src/batter/swing-contact.png`
```
[block] A sprite sheet of 8 frames in one row, equal square cells, side view facing right, same facing as stance-idle: a full baseball swing that connects. Frames 1 to 3 same as a swing, frame 4 the bat meets a white ball at the plate with a small impact star, frame 5 the ball leaves to the upper right and the bat continues, 6 and 7 follow-through, 8 first running step toward the right. Feet on the same baseline in every cell. 2K wide.
```

**B3.5** save to `art-src/batter/take-walk.png`
```
[block] A sprite sheet of 6 frames in one row, equal square cells, side view facing right, same facing as stance-idle: the batter drops the bat and begins a relaxed jog to the right. Frame 1 stance, 2 bat lowered, 3 bat on the ground, 4 to 6 jog cycle. Feet on the same baseline. 2K wide.
```

**B3.8** save to `art-src/batter/strikeout-slump.png`
```
[block] A sprite sheet of 4 frames in one row, equal square cells, side view facing right, same facing as stance-idle: after a strikeout, shoulders drop, head tilts down, bat hangs, then holds still. Not crying, just disappointed. Feet on the same baseline. 2K wide.
```

**B3.10** save to `art-src/batter/hair-short.png, hair-long.png, hair-curly.png, hair-buzz.png`
```
[block] Show the character's head only, side view facing right (matching stance-idle), the same head as the turnaround, bald, wearing the cap, with the hair drawn as a separate shape in purple #8000FF around the cap edge. Four versions in one row: short hair, long hair to the shoulders, curly hair, buzz cut. Same head position in every cell. 2K wide.
```

Stance first. Swings, take-walk, slump and hair must match its facing, or the batter will flip mid-at-bat. Do not regenerate run/trot; they stay left-facing.

## Reject if
- A fielder shows the back of the jersey or the back of the head (except watch-hr).
- The batter faces the camera or faces left in stance, swing, take-walk or slump.
- A swing sheet faces a different way from stance-idle.
- Any green on a character, text, logos, uneven cells, or feet off the baseline (Part C of the prompt pack).
