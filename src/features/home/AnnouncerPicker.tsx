/**
 * Who's in the booth: three big toggle buttons. Tapping a talker plays one of his game-start lines so
 * the kid can hear the voice before choosing. Each tile shows Brandon's cartoon booth-window
 * art (art/booth/menu-*.png); bots do not draw announcer art.
 */
import { ANNOUNCERS, previewLine, type AnnouncerId } from '../../audio/announcer'

const ORDER: AnnouncerId[] = ['bigRed', 'smoothEddie', 'quiet']

/** Packed booth-window poses (scripts/pack-art booth step). Menu only; the game booth keeps its own portraits. */
const BOOTH_ART: Record<AnnouncerId, string> = {
  bigRed: 'menu-bigRed',
  smoothEddie: 'menu-jackDalton',
  quiet: 'menu-quiet',
}

export function BoothArt({ id }: { id: AnnouncerId }) {
  return (
    <img
      data-testid="booth-art"
      data-announcer={id}
      src={`${import.meta.env.BASE_URL}art/booth/${BOOTH_ART[id]}.png`}
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      draggable={false}
      className="h-20 w-20 object-contain"
    />
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
            <BoothArt id={id} />
            <span className="font-display text-xs leading-snug sm:text-sm">{a.name}</span>
            <span className="text-xs leading-snug text-chalk/70">{a.tagline}</span>
          </button>
        )
      })}
    </div>
  )
}
