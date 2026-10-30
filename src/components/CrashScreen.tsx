import { Button } from './Button'
import { Stadium } from './Page'

/**
 * Uses a plain <a> (not router Link) because ErrorBoundary renders this outside RouterProvider,
 * where Link would itself throw. A full page load is the right reset after a crash anyway.
 */
export function CrashScreen({ onReload }: { onReload?: () => void } = {}) {
  function reload() {
    if (onReload) onReload()
    else window.location.reload()
  }
  return (
    <Stadium className="p-8 text-center">
      <h1 className="font-display text-3xl text-chalk">Rain delay!</h1>
      <p className="mt-3 text-chalk/80">Something went wrong. Try again, or head home.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" onClick={reload}>Try again</Button>
        <a href="/players" className="btn-secondary">Home</a>
      </div>
    </Stadium>
  )
}
