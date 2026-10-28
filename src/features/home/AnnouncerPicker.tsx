/**
 * Who's in the booth: three big toggle buttons with pixel portraits. Tapping a talker plays one of
 * his game-start lines so the kid can hear the voice before choosing.
 */
import { ANNOUNCERS, previewLine, type AnnouncerId } from '../../audio/announcer'
import { BoothPortrait } from '../game/Broadcast'

const ORDER: AnnouncerId[] = ['bigRed', 'smoothEddie', 'quiet']

/** Same art as the broadcast booth, so the face on the home screen is the face in the game. */
export function Portrait({ id, size = 64 }: { id: AnnouncerId; size?: number }) {
  return <BoothPortrait id={ANNOUNCERS[id].portrait} size={size} />
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
