import type { Appearance } from '../../data/types'
import type { Hand } from '../../engine/types'

export interface PlayerPreviewProps {
  appearance: Appearance
  hand: Hand
  jerseyNumber: number
  /** CSS size of the square preview. */
  size?: number | string
  className?: string
}

/**
 * The batter, drawn once as a right-handed stance and mirrored for lefties. The same proportions
 * are used by the Phaser field so the preview is honest about what the game will show.
 */
export function PlayerPreview({ appearance: a, hand, jerseyNumber, size = 200, className = '' }: PlayerPreviewProps) {
  const W = 200
  const mirror = hand === 'L' ? `translate(${W},0) scale(-1, 1)` : undefined
  return (
    <svg
      viewBox={`0 0 ${W} 260`}
      width={size}
      height={size}
      data-hand={hand}
      role="img"
      aria-label={`${hand === 'L' ? 'Left' : 'Right'}-handed batter wearing number ${jerseyNumber}`}
      className={className}
    >
      {/* dirt circle */}
      <ellipse cx="100" cy="240" rx="80" ry="14" fill="#c98a4b" opacity="0.9" />
      <g data-figure transform={mirror}>
        {/* bat: over the back shoulder, pointing up and back */}
        <line x1="128" y1="118" x2="168" y2="38" stroke="#b8803c" strokeWidth="11" strokeLinecap="round" />
        <line x1="128" y1="118" x2="140" y2="94" stroke="#6b4a1e" strokeWidth="11" strokeLinecap="round" />
        {/* back leg + front leg */}
        <rect x="74" y="160" width="22" height="58" rx="8" fill={a.pantsColor} />
        <rect x="104" y="160" width="22" height="58" rx="8" fill={a.pantsColor} />
        <rect x="70" y="212" width="30" height="14" rx="6" fill="#1b1b1f" />
        <rect x="100" y="212" width="30" height="14" rx="6" fill="#1b1b1f" />
        {/* socks stripe */}
        <rect x="74" y="196" width="22" height="8" fill={a.primaryColor} />
        <rect x="104" y="196" width="22" height="8" fill={a.primaryColor} />
        {/* torso */}
        <rect x="64" y="100" width="72" height="68" rx="18" fill={a.jerseyColor} />
        <rect x="64" y="100" width="72" height="12" rx="6" fill={a.primaryColor} />
        <text x="100" y="150" textAnchor="middle" fontFamily="Fredoka, Arial Rounded MT Bold, sans-serif" fontWeight="700" fontSize="30" fill={a.secondaryColor}>
          {jerseyNumber}
        </text>
        {/* arms holding the bat near the back shoulder */}
        <path d="M70 112 Q 95 130 124 116" stroke={a.jerseyColor} strokeWidth="16" fill="none" strokeLinecap="round" />
        <circle cx="126" cy="116" r="9" fill={a.skinTone} />
        <circle cx="132" cy="110" r="9" fill={a.skinTone} />
        {/* neck + head */}
        <rect x="90" y="78" width="20" height="24" fill={a.skinTone} />
        <circle cx="100" cy="64" r="26" fill={a.skinTone} />
        {/* hair */}
        <Hair style={a.hairstyle} color={a.hairColor} />
        {/* cap / helmet with brim toward the pitcher (viewer's left in a right-handed stance) */}
        <path d="M74 56 Q 100 24 126 56 Z" fill={a.hatColor} />
        <rect x="72" y="52" width="56" height="10" rx="4" fill={a.hatColor} />
        <rect x="52" y="55" width="30" height="8" rx="4" fill={a.hatColor} />
        {/* face: eye + smile, looking toward the pitcher */}
        <circle cx="90" cy="68" r="2.5" fill="#1b1b1f" />
        <path d="M86 78 Q 94 84 100 80" stroke="#1b1b1f" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Hair({ style, color }: { style: Appearance['hairstyle']; color: string }) {
  switch (style) {
    case 'buzz':
      return <path d="M76 58 Q 100 40 124 58 L 124 62 Q 100 50 76 62 Z" fill={color} />
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="78" cy="66" r="8" /><circle cx="122" cy="66" r="8" /><circle cx="82" cy="78" r="6" /><circle cx="118" cy="78" r="6" />
        </g>
      )
    case 'long':
      return <path d="M74 60 L 72 104 Q 80 108 86 102 L 84 72 L 116 72 L 114 102 Q 120 108 128 104 L 126 60 Z" fill={color} />
    case 'ponytail':
      return (
        <g fill={color}>
          <path d="M76 60 L 76 76 L 82 76 L 82 66 L 118 66 L 118 76 L 124 76 L 124 60 Z" />
          <path d="M122 60 Q 150 66 148 96 Q 140 92 136 80 Q 130 68 122 68 Z" />
        </g>
      )
    case 'afro':
      return <circle cx="100" cy="56" r="34" fill={color} />
    default:
      return <path d="M76 60 L 76 74 L 82 74 L 82 66 L 118 66 L 118 74 L 124 74 L 124 60 Z" fill={color} />
  }
}
