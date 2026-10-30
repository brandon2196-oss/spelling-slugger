# Spelling Slugger Art Contract

This is everything an illustrator needs to draw the new cartoon ballpark for Spelling Slugger, a spelling game for kids. If anything here is unclear, ask Brandon before drawing. Do not guess.

**Who makes the art:** a human artist, through Brandon. The game's bots never generate, buy or scrape character or stadium art. While you draw, the game team builds on simple placeholder shapes, so you are not blocking anyone. When your files arrive, they drop straight into the places listed below.

**The file list:** `public/art/manifest.json` in the repo lists every file this contract asks for, each marked `"status": "missing"` until it is delivered.

---

## 1. Style sheet

- **Look:** bold cartoon. Rounded joints, flat color, exactly one shade of shadow per surface. No gradients. No texture noise.
- **Outlines:** about 3 px thick at delivery size (the 2x files).
- **Proportions:** big head, short body, oversized hands and bat. The batter must read clearly on a phone.
- **Faces:** eyes and a mouth on every character. The two announcers in the booth also need an open mouth and a closed mouth version.
- **Palette:** use these brand colors where they show up in the interface:

| Name | Hex |
| --- | --- |
| Navy | `#142850` |
| Red | `#d7263d` |
| Gold | `#f5b700` |
| Chalk | `#fffaf0` |

  Plus a bright daytime sky, and a grass green that is lighter than `#47a853` so the characters pop off the field.
- **Time of day:** daytime. A night version is optional and not needed for launch.
- **Originality:** nothing licensed. Nothing that looks like a real team, league, mascot or person. Original jerseys, original mascot.

## 2. Canvas and delivery size

- The game screen is **1280 by 960** (4:3), drawn smooth (not pixel art).
- Deliver all raster art (PNG) at **2x**:
  - Character frames: **256 by 256** per frame.
  - Stadium layers: **2560 by 1920** each.
  - Booth portraits: **512 by 512** each.
- Deliver UI chrome as **SVG** on a **1280 by 960** artboard.
- Keep your 2x master files in `art-src/`. That folder is never shipped and is ignored by git. Brandon keeps a copy.
- Transparent backgrounds on everything except the sky.

## 3. The kid's batter is layered and tintable (most important rule)

Kids build their own player: skin tone, hair color, hairstyle, jersey, pants, hat, trim and number color, and left or right stance. So the batter (who is also the runner) is **not** delivered as a finished colored character. It is delivered as **grayscale layers** that the game colors in while it runs.

For **every frame**, deliver each layer below as its own PNG. All layers in a frame must be the same size (256 by 256) and line up exactly.

| Layer file name | What it holds | Colored by the game from |
| --- | --- | --- |
| `outline` | all black line work | never colored |
| `skin` | face, neck, hands, in grayscale | skin tone |
| `hair-short` | short hairstyle | hair color |
| `hair-long` | long hairstyle | hair color |
| `hair-curly` | curly hairstyle | hair color |
| `hair-buzz` | buzz cut | hair color |
| `jersey` | shirt body | jersey color |
| `trim` | sleeves, collar, socks, stripes | trim (primary) color |
| `pants` | pants | pants color |
| `hat` | cap crown | hat color |
| `hat-brim` | cap brim | secondary color |
| `number` | a blank white rectangle where the jersey number goes; the game stamps the number text | secondary color for the text |
| `shoes-bat-glove` | shoes, bat, batting gloves, in their final colors | never colored |

How to shade the grayscale layers: **white where the surface is lit, mid-gray where it is shaded.** The game multiplies the kid's color over it, so your shading shows through.

Only one hair layer is shown at a time, so draw each hairstyle so it works on its own with the hat on.

**Draw the right-handed stance only.** The game mirrors it for lefties.

## 4. Animations and frame counts

All animations play at **12 frames per second**. Frame counts are minimums. More frames are fine if the total stays under the size budget (section 7).

### Batter and runner (layered, as in section 3)

| Clip | Frames | Notes |
| --- | --- | --- |
| `stance-idle` | 4 | small bat waggle, loops |
| `swing-miss` | 8 | full swing, no contact, bat wraps around |
| `swing-contact` | 8 | frame 4 is contact, the ball leaves on frame 5 |
| `take-walk` | 6 | drops the bat, jogs toward first |
| `run` | 6 | loops, used on the basepaths |
| `trot` | 6 | slow home run trot, loops |
| `strikeout-slump` | 4 | shoulders drop, then holds |
| `celebrate` | 6 | jump and fist pump at home plate |

Frame numbers in this contract count from 1. File names count from 00 (see section 7), so "frame 4" is file `03`.

### Pitcher (fixed colors, gray visitors uniform)

| Clip | Frames | Notes |
| --- | --- | --- |
| `pitcher-idle` | 4 | |
| `pitcher-windup-throw` | 10 | ball is released on frame 7 |
| `pitcher-react-hit` | 4 | |

### Fielders (fixed colors, same visitors uniform, two body types)

Draw every clip for both body types.

| Clip | Frames | Notes |
| --- | --- | --- |
| `fielder-idle` | 4 | |
| `fielder-chase` | 6 | loops |
| `fielder-catch` | 6 | |
| `fielder-watch-hr` | 4 | looks up and back at a home run |

### Catcher and umpire

| Clip | Frames | Notes |
| --- | --- | --- |
| `catcher-idle` | 2 | |
| `catcher-receive` | 4 | |
| `ump-idle` | 2 | |
| `ump-strike` | 4 | |
| `ump-punchout` | 6 | strike three |

### Ball

- `ball`: one sprite.
- `ball-spin`: 3 frames.
- `ball-shadow`: one sprite.

### Crowd

- Three rows, each **512 px wide** and **tileable side to side** (the left edge must meet the right edge cleanly).
- Each row has `crowd-idle` (2 frames) and `crowd-cheer` (4 frames).
- Row 1 is nearest the field and the most detailed.

### Mascot (optional for launch)

- `mascot-idle` 4 frames, `mascot-happy` 4 frames, `mascot-sad` 4 frames.
- If you skip the mascot, the game hides it. Nothing breaks.

### Booth portraits

- **Big Red** and **Jack Dalton**, the two announcers, redrawn in this cartoon style.
- Head and shoulders, **512 by 512**.
- Two frames each: `mouth-closed` and `mouth-open`.

## 5. Stadium layers

Each layer is a separate PNG at **2560 by 1920**, all lined up with each other. Listed in draw order, back to front:

1. `sky`: daytime sky with light towers.
2. `outfield-wall`: the wall, with an **empty scoreboard panel** (leave it blank; the game draws live numbers on it).
3. `stands-far`: the far crowd backdrop, static.
4. `grass`: outfield and infield grass, with mowed stripes.
5. `dirt`: infield dirt, mound, batter's boxes, baselines.
6. `chalk`: foul lines, batter's box lines, on-deck circle.
7. `bases`: first, second, third and home plate, each delivered as **its own small sprite** so runners can stand on them.
8. `dugout-near`: the near dugout rail, drawn in front of the batter's feet.
9. `foreground-fence`: optional fence or netting along the very bottom edge.

### Positions to mark

When the stadium is done, tell us (or mark on a guide layer) the pixel position of each of these. We record them in the manifest in game pixels (1280 by 960, so half your 2x numbers):

- Home plate
- First base, second base, third base
- The pitcher's mound
- Left batter's box and right batter's box
- Where the catcher crouches
- Where the umpire stands
- Seven fielder spots: first base, second base, shortstop, third base, left field, center field, right field
- The top edge of the outfield wall, as a line of points from left to right
- The scoreboard panel, as a rectangle (left, top, width, height)
- The point where a home run ball leaves the yard

## 6. UI chrome (SVG, 1280 by 960 artboard)

- **Score bug:** both teams, inning, outs, strikes, and a word counter.
- **Caption bar:** where the announcer's line appears.
- **Banner word treatments,** one SVG each:
  - `STRIKE ONE`
  - `STRIKE TWO`
  - `STRIKE THREE`
  - `BALL FOUR`
  - `BASE HIT`
  - `DOUBLE`
  - `HOME RUN`
  - `RUN SCORED`
  - `RUNS SCORED` (leave a slot for a number)
  - `THREE OUTS`
  - `NEW INNING`
  - `GAME OVER`
  - `WALK-OFF`
  - `YOU WIN`
  - `TOUGH LOSS`
  - `HIGHLIGHT`
- **Broadcast frame corners** and the **ON AIR** tag, in the cartoon style.

## 7. File layout and names

```
art-src/                                  your 2x masters, never shipped (git ignores this folder)
public/art/
  manifest.json                           the list of every file below, plus the positions from section 5
  stadium/<layer>.png                     the nine layers, for example stadium/sky.png
  stadium/bases-home.png, bases-first.png, bases-second.png, bases-third.png
  batter/<clip>/<frame>-<layer>.png       for example batter/swing-contact/03-jersey.png
  pitcher.png + pitcher.json              sprite sheet (atlas) and its frame list
  fielders.png + fielders.json
  catcher-ump.png + catcher-ump.json
  crowd.png + crowd.json
  mascot.png + mascot.json                may be left out
  ball/ball.png, ball/ball-spin-00.png to ball-spin-02.png, ball/ball-shadow.png
  booth/bigRed-mouth-closed.png, booth/bigRed-mouth-open.png
  booth/jackDalton-mouth-closed.png, booth/jackDalton-mouth-open.png
  chrome/<name>.svg                       for example chrome/score-bug.svg, chrome/banner-home-run.svg
```

Naming rules:

- Frame numbers are two digits starting at `00`.
- Batter files: one PNG per layer per frame. 8 clips, 48 frames, 13 layers each: 624 files.
- Banner SVGs are named `banner-` plus the words in lower case with hyphens, for example `banner-strike-one.svg`, `banner-walk-off.svg`, `banner-runs-scored.svg`.
- Pitcher, fielders, catcher and umpire, crowd and mascot: if you prefer, send loose frames named `<clip>-<frame>.png` and the team packs them into the sheets. Fielder frames add the body type, for example `fielder-chase-a-02.png`.

The game packs the batter frames into sheets with its own script. You do not need TexturePacker or any paid tool.

**Size budget:** everything under `public/art/` must total **8 MB or less** after PNG optimization. Keep flat colors flat and avoid noise; it compresses far better.

## 8. Artist checklist

Tick each box when it is delivered.

**Style**
- [ ] Bold cartoon, about 3 px outlines at 2x, flat color, one shadow shade, no gradients or texture
- [ ] Big heads, short bodies, oversized hands and bat
- [ ] Brand colors used as listed; grass lighter than `#47a853`; daytime
- [ ] Nothing licensed or imitating a real team, league, mascot or person

**Batter (layered, right-handed only, 256 by 256, all 13 layers per frame, lined up)**
- [ ] `stance-idle` (4)
- [ ] `swing-miss` (8)
- [ ] `swing-contact` (8, contact on frame 4)
- [ ] `take-walk` (6)
- [ ] `run` (6)
- [ ] `trot` (6)
- [ ] `strikeout-slump` (4)
- [ ] `celebrate` (6)
- [ ] Grayscale layers are white when lit, mid-gray when shaded

**Other characters**
- [ ] Pitcher: `pitcher-idle` (4), `pitcher-windup-throw` (10, release on 7), `pitcher-react-hit` (4)
- [ ] Fielders, both body types: `fielder-idle` (4), `fielder-chase` (6), `fielder-catch` (6), `fielder-watch-hr` (4)
- [ ] Catcher: `catcher-idle` (2), `catcher-receive` (4)
- [ ] Umpire: `ump-idle` (2), `ump-strike` (4), `ump-punchout` (6)
- [ ] Ball: `ball`, `ball-spin` (3), `ball-shadow`
- [ ] Crowd: 3 tileable rows, 512 px wide, `crowd-idle` (2) and `crowd-cheer` (4) per row
- [ ] Mascot (optional): `mascot-idle` (4), `mascot-happy` (4), `mascot-sad` (4)
- [ ] Booth: Big Red and Jack Dalton, 512 by 512, mouth closed and mouth open

**Stadium (2560 by 1920, lined up)**
- [ ] `sky`
- [ ] `outfield-wall` with a blank scoreboard panel
- [ ] `stands-far`
- [ ] `grass`
- [ ] `dirt`
- [ ] `chalk`
- [ ] `bases` as four separate sprites
- [ ] `dugout-near`
- [ ] `foreground-fence` (optional)
- [ ] All positions from section 5 marked

**UI chrome (SVG, 1280 by 960)**
- [ ] Score bug
- [ ] Caption bar
- [ ] All 16 banner words
- [ ] Frame corners and ON AIR tag

**Delivery**
- [ ] 2x masters in `art-src/`
- [ ] Shipping files in `public/art/` with the names in section 7
- [ ] Total under 8 MB after optimization
