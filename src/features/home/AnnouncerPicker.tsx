/**
 * Who's in the booth: three big toggle buttons with pixel portraits. Tapping a talker plays one of
 * his game-start lines so the kid can hear the voice before choosing.
 */
import { ANNOUNCERS, previewLine, type AnnouncerId } from '../../audio/announcer'

const ORDER: AnnouncerId[] = ['bigRed', 'smoothEddie', 'quiet']

const PALETTE: Record<string, string> = {
  h: '#d6dae2', // grey hair
  s: '#f1c27d', // skin
  e: '#1b1b2f', // eyes
  m: '#b5533c', // mouth
  r: '#d7263d', // red blazer
  w: '#fdf8ef', // shirt / mic grille
  k: '#1b1b2f', // tie, mic body
  g: '#f2b134', // gold mic / chain
  a: '#4a2c1a', // brown hair
  d: '#101014', // sunglasses
  u: '#2a6fdb', // blue shirt
  b: '#6b7280', // booth frame
}

// 16x16 grids; '.' is transparent.
const PORTRAITS: Record<AnnouncerId, string[]> = {
  bigRed: [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhssssssshh..',
    '...hsssssssssh..',
    '...hseesssees...',
    '....ssssssss..gg',
    '....sssmmmss..gg',
    '.....ssssss...k.',
    '......ssss....k.',
    '...rrrrwwrrrr.k.',
    '..rrrrwkkwrrrrk.',
    '..rrrrwkkwrrrr..',
    '.rrrrrwkkwrrrrr.',
    '.rrrrrwwwwrrrrr.',
    '.rrrrrrrrrrrrrr.',
  ],
  smoothEddie: [
    '................',
    '.....aaaaaa.....',
    '....aaaaaaaa....',
    '...aassssssaa...',
    '...asssssssss...',
    '...addddsdddd...',
    '....ssssssss....',
    '....ssssmmss....',
    '.....ssssss.....',
    '......ssss......',
    '...uuuussuuuu...',
    '..uuuusggssuuu..',
    '..uuuuugguuuuu..',
    '.uuuuuuuuuuuuuu.',
    '.uuuuuuuuuuuuuu.',
    '.uuuuuuuuuuuuuu.',
  ],
  quiet: [
    'bbbbbbbbbbbbbbbb',
    'b..............b',
    'b..............b',
    'b.....kkkk.....b',
    'b....kwkwkk....b',
    'b....kkwkwk....b',
    'b....kwkwkk....b',
    'b....kkwkwk....b',
    'b.....kkkk.....b',
    'b.......k......b',
    'b.......k......b',
    'b.....kkkkk....b',
    'b..............b',
    'b..............b',
    'b..............b',
    'bbbbbbbbbbbbbbbb',
  ],
}

export function Portrait({ id, size = 64 }: { id: AnnouncerId; size?: number }) {
  const rows = PORTRAITS[id]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />)),
      )}
      {id === 'quiet' ? <path d="M3 3 L13 13" stroke="#d7263d" strokeWidth={1.5} strokeLinecap="square" /> : null}
    </svg>
  )
}

export interface AnnouncerPickerProps {
  value: AnnouncerId
  onChange: (id: AnnouncerId) => void
}

export function AnnouncerPicker({ value, onChange }: AnnouncerPickerProps) {
  return (
    <div role="group" aria-label="Announcer" className="grid grid-cols-3 gap-3">
      {ORDER.map((id) => {
        const a = ANNOUNCERS[id]
        const pressed = id === value
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => {
              onChange(id)
              if (id !== 'quiet') void previewLine(id)
            }}
            className={
              'flex min-h-40 flex-col items-center gap-2 rounded-2xl border-4 px-2 py-3 text-center transition ' +
              (pressed
                ? 'border-gold bg-gold/15 text-chalk shadow-[0_0_0_4px_rgba(242,177,52,0.25)]'
                : 'border-chalk/20 bg-navy/40 text-chalk/80 hover:border-chalk/50 active:scale-95')
            }
          >
            <Portrait id={id} />
            <span className="font-display text-xs leading-snug sm:text-sm">{a.name}</span>
            <span className="text-xs leading-snug text-chalk/70">{a.tagline}</span>
          </button>
        )
      })}
    </div>
  )
}
