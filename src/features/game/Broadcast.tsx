import type { ReactNode } from 'react'
import type { GameState } from '../../engine/types'
import { Announcement } from './Announcement'
import { Scoreboard, type BugPlayer } from './Scoreboard'

export type AnnouncerPortrait = 'bigRed' | 'smoothEddie' | 'quiet'
export type BroadcastMode = 'weekly' | 'practice' | 'missed'

export interface BroadcastProps {
  /** The field. */
  children: ReactNode
  state: GameState
  player: BugPlayer
  mode: BroadcastMode
  announcer: { name: string; portrait: AnnouncerPortrait; speaking: boolean }
  /** What the booth is saying, shown as a closed caption. Null hides the bar. */
  caption: string | null
  /** The big pop on the board ("DOUBLE!"). Null hides it. */
  announcement: string | null
}

const MODE_LABEL: Record<BroadcastMode, string> = { weekly: 'Weekly', practice: 'Practice', missed: 'Missed words' }

/** A 90s TV set around the field: score bug, announcer window, caption bar and the LIVE tag over the glass. */
export function Broadcast({ children, state, player, mode, announcer, caption, announcement }: BroadcastProps) {
  return (
    <div className="broadcast">
      <div className="broadcast-screen">
        {children}
        <div className="broadcast-overlay pointer-events-none">
          <div className="absolute left-[2%] top-[2.5%]">
            <Scoreboard state={state} player={player} />
          </div>
          <div className="absolute right-[2%] top-[2.5%]">
            <AnnouncerWindow {...announcer} />
          </div>
          <Announcement text={announcement} />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-end">
            <LiveTag mode={mode} />
            <CaptionBar text={caption} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LiveTag({ mode }: { mode: BroadcastMode }) {
  return (
    <div className="live-tag pixel-text mb-[2%] mr-[2%] inline-flex items-center gap-[0.6em] rounded-sm px-[0.7em] py-[0.4em] uppercase" aria-hidden="true">
      <span className="live-dot" />
      <span>Live</span>
      <span className="opacity-80">{MODE_LABEL[mode]}</span>
    </div>
  )
}

function CaptionBar({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div role="status" aria-label="Commentary" className="caption-bar pixel-text w-full px-[1.2em] py-[0.8em]">
      <span className="caption-mark mr-[0.8em]" aria-hidden="true">&gt;</span>
      {text}
    </div>
  )
}

export function AnnouncerWindow({ name, portrait, speaking }: BroadcastProps['announcer']) {
  const quiet = portrait === 'quiet'
  return (
    <div
      data-testid="announcer-window"
      data-speaking={speaking && !quiet ? '1' : undefined}
      className="announcer-window pixel-text inline-flex flex-col items-stretch rounded-sm overflow-hidden"
    >
      <div className="portrait p-[0.5em]" aria-hidden="true">
        <BoothPortrait id={portrait} />
      </div>
      <div className="name-plate px-[0.7em] py-[0.45em] text-center uppercase">{quiet ? 'QUIET BOOTH' : name}</div>
    </div>
  )
}

/* ---------- Pixel portraits ----------
 * 16×16 grids, one letter per cell, drawn as SVG rects. `.` is transparent. The mouth is drawn
 * separately so the window can flip it open and closed while the announcer speaks. */

interface PortraitArt {
  grid: string[]
  palette: Record<string, string>
  /** [x, y, w, h, fill] */
  mouthClosed: [number, number, number, number, string][]
  mouthOpen: [number, number, number, number, string][]
}

const INK = '#1b1b1f'
const CHALK = '#fffaf0'

const bigRed: PortraitArt = {
  grid: [
    '......hhhh......',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '..wssssssssssw..',
    '..wssssssssssw..',
    '..wsepssssepsw..',
    '..wssssskssssw..',
    '...shhhhhhhhs...',
    '....ssssssss....',
    '.....ssssss.....',
    '...jjjjjttjjjj..',
    '.jjjjjjjttjjjjj.',
    '.jjjjjjjttjjjjj.',
    'jjjjjjjjttjjjjjj',
    'jjjjjjjjttjjjjjj',
  ],
  palette: { h: '#d9532b', s: '#f1c3a3', e: CHALK, p: INK, k: '#b5704d', w: '#3a3a44', j: '#142850', t: '#f5b700' },
  mouthClosed: [[6, 9, 4, 1, '#7a1020']],
  mouthOpen: [[5, 9, 6, 2, '#3a0a12'], [6, 9, 4, 1, CHALK]],
}

const smoothEddie: PortraitArt = {
  grid: [
    '....cccccccc....',
    '...cccccccccc...',
    '..cccccccccccc..',
    '..cccccccccccccc',
    '...ssssssssss...',
    '...ssssssssss...',
    '..dddddkddddd...',
    '...ssssssssss...',
    '...ssssskssss...',
    '...ssssssssss...',
    '....sshhhhss....',
    '.jjjjjjgjjgjjjj.',
    '.jjjjjjjggjjjjj.',
    'jjjjjjjjjjjjjjjj',
    'jjjjjjjjjjjjjjjj',
    'jjjjjjjjjjjjjjjj',
  ],
  palette: { c: '#6b3fa0', s: '#8d5a3b', d: INK, k: '#5a3520', h: '#2b1a12', j: '#1b8a8f', g: '#f5b700' },
  mouthClosed: [[6, 9, 4, 1, '#3a1a10']],
  mouthOpen: [[5, 9, 6, 2, '#2a0f0a'], [6, 9, 4, 1, CHALK]],
}

const quiet: PortraitArt = {
  grid: [
    '................',
    '......kkkk......',
    '.....kggggk.....',
    '.....kggggk.....',
    '.....kggggk.....',
    '.....kggggk.....',
    '......kkkk......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
  palette: { k: '#3a3a44', g: '#9aa0a6' },
  mouthClosed: [],
  mouthOpen: [],
}

const PORTRAITS: Record<AnnouncerPortrait, PortraitArt> = { bigRed, smoothEddie, quiet }

/** Turns a letter grid into horizontal runs of rects (fewer nodes than one rect per cell). */
function runs(grid: string[], palette: Record<string, string>): [number, number, number, string][] {
  const out: [number, number, number, string][] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]!
      let w = 1
      while (x + w < row.length && row[x + w] === ch) w++
      if (ch !== '.') {
        const fill = palette[ch]
        if (!fill) throw new Error(`Portrait grid uses "${ch}" which is not in its palette`)
        out.push([x, y, w, fill])
      }
      x += w
    }
  })
  return out
}

/** The booth's pixel portrait. Also used by the home-screen picker so the kid picks the face they'll see. */
export function BoothPortrait({ id, size }: { id: AnnouncerPortrait; size?: number }) {
  const art = PORTRAITS[id]
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className="booth-portrait" role="img" aria-hidden="true" focusable="false">
      {runs(art.grid, art.palette).map(([x, y, w, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={fill} />
      ))}
      <g className="mouth-closed">
        {art.mouthClosed.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />)}
      </g>
      <g className="mouth-open">
        {art.mouthOpen.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />)}
      </g>
    </svg>
  )
}
