import type { CSSProperties } from 'react'
import type { Appearance } from '../../data/types'
import type { Hand } from '../../engine/types'
import { batterHairLayer, batterLayerColor } from '../../field/batterTint'

export interface PlayerPreviewProps {
  appearance: Appearance
  hand: Hand
  jerseyNumber: number
  /** CSS size of the square preview. */
  size?: number | string
  className?: string
}

/** Back to front, same order as the game's CartoonScene (stance-idle frame 0 has no number layer). */
const DRAW = ['hair', 'skin', 'pants', 'jersey', 'trim', 'shoes-bat-glove', 'hat', 'hat-brim', 'outline'] as const

const src = (layer: string) => `${import.meta.env.BASE_URL}art/batter/stance-idle/00-${layer}.png`

/**
 * The game's packed cartoon batter (stance-idle, frame 0), tinted from the kid's look the same way
 * the field tints it, and mirrored for lefties. Tint is multiply over the packed layer, like Phaser.
 */
export function PlayerPreview({ appearance: a, hand, jerseyNumber, size = 200, className = '' }: PlayerPreviewProps) {
  const hair = batterHairLayer(a.hairstyle)
  const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }
  return (
    <div
      data-testid="cartoon-batter"
      data-hand={hand}
      role="img"
      aria-label={`${hand === 'L' ? 'Left' : 'Right'}-handed batter wearing number ${jerseyNumber}`}
      className={className}
      style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}
    >
      <div data-figure style={{ ...fill, transform: hand === 'L' ? 'scaleX(-1)' : undefined }}>
        {DRAW.map((slot) => {
          const layer = slot === 'hair' ? hair : slot
          const color = batterLayerColor(layer, a)
          const url = src(layer)
          return (
            <div key={layer} data-layer={layer} data-tint={color} style={{ ...fill, isolation: 'isolate' }}>
              <img src={url} alt="" draggable={false} style={{ ...fill, objectFit: 'contain' }} />
              {color && (
                <span
                  aria-hidden
                  style={{
                    ...fill, backgroundColor: color, mixBlendMode: 'multiply',
                    WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
                    WebkitMaskSize: 'contain', maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center', maskPosition: 'center',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      <span
        data-testid="jersey-number"
        aria-hidden
        style={{
          position: 'absolute', right: '4%', bottom: '4%', minWidth: '1.8em', padding: '0.1em 0.35em',
          borderRadius: '999px', textAlign: 'center', fontFamily: 'Fredoka, Arial Rounded MT Bold, sans-serif',
          fontWeight: 700, fontSize: 'clamp(12px, 1.1em, 22px)', background: a.jerseyColor, color: a.secondaryColor,
          border: `3px solid ${a.primaryColor}`,
        }}
      >
        {jerseyNumber}
      </span>
    </div>
  )
}
