/**
 * Who's in the booth: three big toggle buttons. Tapping a talker plays one of his game-start lines so
 * the kid can hear the voice before choosing. Faces are neutral placeholders until Brandon's cartoon
 * booth art lands (art-only follow-up PR); bots do not draw announcer art.
 */
import { ANNOUNCERS, previewLine, type AnnouncerId } from '../../audio/announcer'

const ORDER: AnnouncerId[] = ['bigRed', 'smoothEddie', 'quiet']

function initials(name: string) {
  return name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('')
}

export function BoothPlaceholder({ id }: { id: AnnouncerId }) {
  const label = id === 'quiet' ? '—' : initials(ANNOUNCERS[id].name)
  return (
    <span
      data-testid="booth-placeholder"
      data-announcer={id}
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-dashed border-gold/60 bg-navy/60 font-display text-xl text-gold"
    >
      {label}
    </span>
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
            <BoothPlaceholder id={id} />
            <span className="font-display text-xs leading-snug sm:text-sm">{a.name}</span>
            <span className="text-xs leading-snug text-chalk/70">{a.tagline}</span>
          </button>
        )
      })}
    </div>
  )
}
