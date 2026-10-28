/**
 * The booth. Two original announcer characters (plus a quiet booth) with rotating, G-rated lines
 * per game event, spoken through the same `speak()` path as the word itself so the e2e speech stub
 * sees them. Lines never repeat back to back; placeholders `{runs}`, `{inning}`, `{word}` are filled
 * from the commentary context.
 */
import { createPicker } from './pool'
import { availableVoices, speak, speechAvailable } from './speech'

export const ANNOUNCE_EVENTS = [
  'gameStart', 'double', 'single', 'walk', 'strike1', 'strike2', 'strikeout', 'run', 'runs', 'inningEnd', 'gameOver',
] as const
export type AnnounceEvent = (typeof ANNOUNCE_EVENTS)[number]

/**
 * `runs`: runs scored on the play. `inning`: the inning about to be played (after an inning end,
 * the new one; 0 when unknown, e.g. on a strike). `word`: the word just spelled, when there is one.
 */
export interface CommentaryContext {
  runs: number
  inning: number
  word?: string
}

export type AnnouncerId = 'bigRed' | 'smoothEddie' | 'quiet'

export interface Announcer {
  id: AnnouncerId
  name: string
  tagline: string
  portrait: 'bigRed' | 'smoothEddie' | 'quiet'
  voice: { rate: number; pitch: number; prefer: RegExp }
  lines: Record<AnnounceEvent, string[]>
}

const bigRed: Announcer = {
  id: 'bigRed',
  name: 'Big Red Brannigan',
  tagline: 'Old-school booth. Big voice. "OH MY STARS!"',
  portrait: 'bigRed',
  voice: { rate: 0.95, pitch: 0.7, prefer: /daniel|fred|aaron|alex|google uk english male|david|mark/i },
  lines: {
    gameStart: [
      'Good evening, folks, and welcome to the ballpark! The forecast calls for big hits and bigger smiles!',
      "OH MY STARS, what a night for baseball! Grab your bat, slugger, it's game time!",
      "The lights are on and the crowd is buzzing like a summer thunderstorm! Let's play ball!",
      'Welcome, welcome, welcome! Clear skies, fresh chalk, and a slugger stepping in. I love it!',
      "Hold onto your hats, folks! There's a storm of spelling rolling into the stadium tonight!",
      'Here we go! First pitch is moments away, and I can feel the electricity in the air!',
    ],
    double: [
      "OH MY STARS! {word} is ROCKETED into the gap! That's a stand-up double!",
      'Would you look at that! A line drive to the wall, and the slugger cruises into second!',
      'That ball took off like a bolt of lightning! DOUBLE!',
      'Right down the line! The crowd is on its feet and the slugger is on second base!',
      'A thunderclap off the bat! {word}, spelled perfectly, two bases, no doubt about it!',
      "Oh, that's a beauty! A frozen rope into the corner, and we've got a double, folks!",
    ],
    single: [
      'Base hit! Clean as a spring morning, and the slugger is aboard!',
      'A sharp single through the infield! {word}, spelled and delivered!',
      'That one found the grass! Nice piece of hitting right there!',
      'Base hit, folks! Not flashy, but it counts, and the crowd knows it!',
      'A little rain shower of a hit, drops right in front of the outfielder! Single!',
      'Solid contact! The slugger shakes off that first swing and gets a hit!',
    ],
    walk: [
      'Ball four! Take your base, slugger. Patience pays, folks!',
      'The umpire waves our slugger down to first! A walk is as good as a hit tonight!',
      "That's a free pass! The slugger jogs on down to first base!",
      "Good eye, good eye! Ball four and we've got a runner!",
      'Take your base! The dugout is cheering and so is this booth!',
    ],
    strike1: [
      "Strike one! No worries, slugger, the sky's still blue. Take a breath and swing again!",
      "A swing and a miss! Shake it off, folks, there's plenty of game left!",
      "Strike one on the board. Settle in, slugger, you've got two more pitches!",
      "Just a little off the mark! Dig in, the next one's yours!",
      'Strike one! Even the greats take a strike now and then!',
      'Missed it by a whisker! Keep your eye on the ball, slugger!',
    ],
    strike2: [
      "Strike two! The pressure's building like a summer storm, but our slugger has weathered worse!",
      'Two strikes! Here is where champions dig in, folks!',
      "Strike two, and the crowd leans forward! Come on, slugger, you've got this!",
      "That's two! Deep breath, slugger. One good swing changes everything!",
      'Strike two on the count. Nobody in this ballpark is giving up on you!',
      "Ooh, close one! Strike two, but there's one more pitch to shine!",
    ],
    strikeout: [
      'Strike three. OH MY STARS, that pitcher was tough tonight! Hold your head high, slugger, the next at-bat is a fresh start!',
      'A strikeout, but the crowd gives a warm hand. Every slugger takes a seat sometimes!',
      'Strike three! Tough break, but storms pass and the sun comes back. Shake it off!',
      "That's a strikeout. {word} is a tricky one, folks! Our slugger will remember it next time!",
      'Strike three! Nothing to hang your head about. The best hitters miss more than they hit!',
      'Swung right through strike three. Back to the dugout, but back with a smile!',
    ],
    run: [
      'OH MY STARS! A run comes across the plate! The scoreboard lights up!',
      'Rounding third, heading home, and SAFE! One run on the board!',
      'A run scores! This crowd is louder than a thunderclap!',
      "Touch 'em all! A run comes in and the dugout goes wild!",
      'Across the plate! One run, and the stands are shaking!',
      "RUN SCORED! That's the sound of a slugger's hard work paying off, folks!",
    ],
    runs: [
      "OH MY STARS! {runs} runs come across! It's raining runs at the ballpark!",
      '{runs} runs score on the play! This crowd is roaring like a hurricane!',
      "Count 'em, folks: {runs} runs! The scoreboard operator can't keep up!",
      'A downpour of runs! {runs} of them cross the plate!',
      "{runs} runs! That's a thunderstorm of offense, and the stands are shaking!",
      'They just keep coming home! {runs} runs score!',
    ],
    inningEnd: [
      "Three outs! On to inning {inning}, folks! Grab a snack, we'll be right back!",
      'Three outs, and the inning is in the books! Stretch those legs!',
      "That's the side! Inning {inning} is coming up, and what a ride it's been so far!",
      'The side is retired! Time for the grounds crew and a quick breather!',
      'Three outs! The scoreboard flips, and here comes a brand-new inning!',
      "Inning {inning}, here we come! The weather's holding and so is this slugger!",
    ],
    gameOver: [
      "And that's the ballgame! OH MY STARS, what a show tonight!",
      'Final out! The crowd is on its feet, and so am I. What a game, folks!',
      "That's the ballgame! Tip your cap, slugger, you earned every cheer!",
      'Game over! The lights dim, the fans head home happy, and this booth is proud!',
      "That's a final! A hundred smiles in the stands tonight!",
      'The last pitch has been thrown! What a night at the ballpark, folks! Goodnight, everybody!',
    ],
  },
}

const smoothEddie: Announcer = {
  id: 'smoothEddie',
  name: 'Smooth Eddie Breeze',
  tagline: 'Laid-back, rhymes a little. "Easy breezy."',
  portrait: 'smoothEddie',
  voice: { rate: 0.85, pitch: 0.8, prefer: /rocko|eddy|reed|google us english|guy|james|aaron/i },
  lines: {
    gameStart: [
      "Hey there, slugger. Easy breezy, nice and easy. Let's go play some ball.",
      "Welcome to the yard, my friend. Sun's out, bats out, no stress about it.",
      "All right, all right. Step on in, take a breath, let's have some fun today.",
      "What's up, slugger? Keep it loose, keep it smooth, and let the hits come to you.",
      "Good vibes only at the ballpark tonight. Easy breezy, let's play.",
      'Here we go, friend. Relax your shoulders, trust your swing, and enjoy the ride.',
    ],
    double: [
      "Oh yeah, that's a double, baby! Smooth as a wave on a glassy day.",
      '{word}, spelled just right. Ride that line drive all the way to second, friend.',
      'Easy breezy, into the gap you go. Stand-up double.',
      "Now that's the sound I like. Two bases, all class, no sweat.",
      'Clean and mean, into the green. Double!',
      'Look at you go, slugger. Second base, cool as a sea breeze.',
    ],
    single: [
      'Base hit, nice and neat. Easy breezy, friend.',
      "There it is. Little flick of the wrists and you're on first. Smooth.",
      "{word}? Yeah, you got it. Single up the middle, let's keep it rolling.",
      'Nothing fancy, nothing flashy, just a hit that counts. I dig it.',
      'Through the hole and onto the bag. Nice swing, slugger.',
      'Base hit, no doubt. Your groove is coming along.',
    ],
    walk: [
      'Ball four, my friend. Jog on down, nice and easy.',
      'Good eye, good eye. Take your base, no rush.',
      "That's a walk. Sometimes the best swing is no swing. Smooth.",
      "Free trip to first, slugger. I'll take it every time.",
      "Ball four. Patience is a virtue, and you've got plenty.",
      'On you go, easy breezy, down to first base.',
    ],
    strike1: [
      "Strike one. No worries, friend. Shake it off, we've got time.",
      'Just a little early on that one. Breathe easy and reset.',
      "Strike one. That's cool, that's cool. Next pitch is a fresh pitch.",
      'Missed it, no big deal. Even the ocean misses the beach sometimes.',
      "That's one. Loosen up those shoulders and have another look.",
      'Strike one on the board. Keep it easy breezy, slugger.',
    ],
    strike2: [
      'Strike two. Still in this, friend. Just you and the ball now.',
      'Two strikes, but hey, the best stories have a little drama.',
      "That's two. Slow down, see it clear, let it fly.",
      'Strike two. Breathe in, breathe out, you know this one.',
      'Down to the last pitch, and I like your chances, slugger.',
      'Two strikes, zero stress. One good swing is all it takes.',
    ],
    strikeout: [
      "Strike three. Hey, that's baseball, friend. Next at-bat is a brand-new wave.",
      'Struck out swinging. Chin up, slugger. That word will be yours next time.',
      "That's three. Tough one, {word}. Shake it off and ride the next pitch.",
      'Strikeout, but you took your swings. I respect that, friend.',
      "That's a K. Even the smoothest hitters sit down sometimes. Easy breezy, next time.",
      'Three strikes. No sweat, slugger. The sun comes up tomorrow, and so does the lineup.',
    ],
    run: [
      "And there's a run, slugger. Cross that plate, nice and smooth.",
      'Run scores! Smooth sailing all the way home.',
      "That's one on the board. Easy breezy, friend.",
      'Around third and home. Fist bump, slugger.',
      'Run comes in! The vibes in this ballpark are off the charts.',
      'Touch home, take a bow. One run for the good guys.',
    ],
    runs: [
      "{runs} runs cross the plate! That's a party, friend.",
      'Oh my, {runs} runs. The surf is up at the ballpark.',
      '{runs} runs score! Smooth as can be.',
      'Count them up, slugger: {runs} runs. Easy breezy, all day.',
      '{runs} coming home! Somebody turn up the music.',
      "That's {runs} runs on one swing. You're in the groove now.",
    ],
    inningEnd: [
      "And that's three outs. Grab some water, we'll roll into inning {inning}.",
      "Inning's over, friend. Stretch it out, breathe it in.",
      'Three outs, no stress. On to inning {inning}.',
      'That wraps that one up. Fresh inning coming, fresh vibes.',
      "Side retired. Take a sip, take a breath, we're just getting warmed up.",
      "Inning {inning} is up next. Easy breezy, let's keep it rolling.",
    ],
    gameOver: [
      "And that's the ballgame, friend. You showed up, you swung, you smiled. That's a win in my book.",
      'Final out. Smooth game, slugger. Catch you next time at the yard.',
      "That's a wrap. Hats off to you, my friend. Easy breezy, well played.",
      'Game over. Good swings, good vibes, good times. See you tomorrow.',
      'The last pitch is in. Walk off tall, slugger, you earned it.',
      "That's the final. Nice and easy, start to finish. Proud of you, friend.",
    ],
  },
}

const quiet: Announcer = {
  id: 'quiet',
  name: 'Quiet Booth',
  tagline: 'Sounds only. No talking.',
  portrait: 'quiet',
  voice: { rate: 1, pitch: 1, prefer: /$^/ },
  lines: { gameStart: [], double: [], single: [], walk: [], strike1: [], strike2: [], strikeout: [], run: [], runs: [], inningEnd: [], gameOver: [] },
}

export const ANNOUNCERS: Record<AnnouncerId, Announcer> = { bigRed, smoothEddie, quiet }

// ---- line rotation -----------------------------------------------------------------------------

const pickers = new Map<string, () => string>()

function picker(id: AnnouncerId, event: AnnounceEvent, withWord: boolean, rng?: () => number): (() => string) | null {
  const key = `${id}:${event}:${withWord ? 'w' : 'nw'}`
  let p = pickers.get(key)
  if (!p) {
    const all = ANNOUNCERS[id].lines[event]
    const lines = withWord ? all : all.filter((l) => !l.includes('{word}'))
    if (lines.length === 0) return null
    p = createPicker(lines, rng)
    pickers.set(key, p)
  }
  return p
}

function fill(line: string, ctx: CommentaryContext): string {
  return line
    .replace(/\{runs\}/g, String(ctx.runs))
    .replace(/\{inning\}/g, String(ctx.inning))
    .replace(/\{word\}/g, ctx.word ?? '')
}

/** One line for the event, never the same as the previous one for that (announcer, event). '' for quiet. */
export function lineFor(id: AnnouncerId, event: AnnounceEvent, ctx: CommentaryContext, rng?: () => number): string {
  const p = picker(id, event, ctx.word !== undefined && ctx.word !== '', rng)
  return p ? fill(p(), ctx) : ''
}

// ---- voice -------------------------------------------------------------------------------------

/** The persona's preferred English voice, else any en-US, else any English voice, else null. */
export function pickAnnouncerVoice<V extends { name: string; lang: string }>(voices: V[], id: AnnouncerId): V | null {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  // Walk the persona's preferences in order (the regex lists best first), not the system's order.
  for (const alt of ANNOUNCERS[id].voice.prefer.source.split('|')) {
    const re = new RegExp(alt, 'i')
    const hit = en.find((v) => re.test(v.name))
    if (hit) return hit
  }
  return en.find((v) => v.lang.toLowerCase() === 'en-us') ?? en[0] ?? null
}

// ---- speaking state ----------------------------------------------------------------------------

export interface AnnouncerSpeaking {
  speaking: boolean
  line: string | null
}

type Listener = (s: AnnouncerSpeaking) => void
const listeners = new Set<Listener>()
let current: AnnouncerSpeaking = { speaking: false, line: null }

function emit(s: AnnouncerSpeaking): void {
  current = s
  for (const cb of listeners) cb(s)
}

export const announcerState = {
  get: (): AnnouncerSpeaking => current,
  subscribe(cb: Listener): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

// ---- speaking ----------------------------------------------------------------------------------

/** Speak one line for the event as the given announcer. Resolves when done; no-op for quiet / no speech. */
export async function sayAs(id: AnnouncerId, event: AnnounceEvent, ctx: CommentaryContext): Promise<void> {
  if (id === 'quiet' || !speechAvailable()) return
  const line = lineFor(id, event, ctx)
  if (!line) return
  const { rate, pitch } = ANNOUNCERS[id].voice
  const voice = pickAnnouncerVoice(availableVoices(), id)
  emit({ speaking: true, line })
  try {
    await speak(line, { rate, pitch, voice, onStart: () => emit({ speaking: true, line }) })
  } catch {
    /* speech failed mid-way; fall through to clear state */
  } finally {
    emit({ speaking: false, line: null })
  }
}

/** A sample game-start line, for the picker on the home screen. */
export function previewLine(id: AnnouncerId): Promise<void> {
  return sayAs(id, 'gameStart', { runs: 0, inning: 1 })
}
