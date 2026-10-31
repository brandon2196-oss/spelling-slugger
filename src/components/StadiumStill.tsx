/** Drawn in the same order as the game's stadium (public/art/manifest.json), minus the near fence. */
export const STADIUM_STILL_LAYERS = ['sky', 'outfield-wall', 'stands-far', 'grass', 'dirt', 'chalk', 'bases', 'dugout-near'] as const

/** A still of the cartoon stadium, stacked from the packed layers the game already ships. No live scene. */
export function StadiumStill({ className = '', label = 'The cartoon baseball stadium' }: { className?: string; label?: string }) {
  return (
    <div className={`stadium-still rounded-md ${className}`} role="img" aria-label={label}>
      {STADIUM_STILL_LAYERS.map((layer) => (
        <img key={layer} src={`${import.meta.env.BASE_URL}art/stadium/${layer}.png`} alt="" />
      ))}
    </div>
  )
}
