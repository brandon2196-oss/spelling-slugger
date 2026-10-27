/** The big flash on the board. One line at a time; the parent sequences them. */
export function Announcement({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div
      key={text}
      role="status"
      aria-live="assertive"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span className="announce font-display text-5xl sm:text-7xl text-gold drop-shadow-[0_6px_0_#0a1630] text-center px-4">
        {text}
      </span>
    </div>
  )
}
