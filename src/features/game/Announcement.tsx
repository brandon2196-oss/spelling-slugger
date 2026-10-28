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
      <span className="announce announce-pixel pixel-text text-center px-4 text-[clamp(1.1rem,4.5vw,3rem)] leading-tight uppercase">
        {text}
      </span>
    </div>
  )
}
