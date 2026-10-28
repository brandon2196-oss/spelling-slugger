/**
 * Uniform random picker that never hands back the same item twice in a row (when there is more
 * than one). Used by the sound pools and the announcer line lists.
 */
export function createPicker<T>(items: T[], rng: () => number = Math.random): () => T {
  if (items.length === 0) throw new Error('createPicker: empty pool')
  let prev = -1
  return () => {
    if (items.length === 1) return items[0]!
    // Draw from the n-1 items that are not the previous one.
    const n = prev < 0 ? items.length : items.length - 1
    let i = Math.min(n - 1, Math.floor(rng() * n))
    if (prev >= 0 && i >= prev) i++
    prev = i
    return items[i]!
  }
}
