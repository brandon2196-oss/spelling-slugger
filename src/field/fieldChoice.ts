/** Which stadium to draw: build-time VITE_FIELD, overridden by a hidden device toggle. */
export type FieldKind = 'cartoon' | 'pixel'
const KEY = 'slugger.field'

export function buildDefaultField(env: string | undefined = import.meta.env.VITE_FIELD): FieldKind {
  return env === 'pixel' ? 'pixel' : 'cartoon'
}

export function readFieldKind(): FieldKind {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'cartoon' || v === 'pixel') return v
  } catch { /* ignore */ }
  return buildDefaultField()
}

export function toggleFieldKind(): FieldKind {
  const next: FieldKind = readFieldKind() === 'cartoon' ? 'pixel' : 'cartoon'
  try { localStorage.setItem(KEY, next) } catch { /* ignore */ }
  return next
}
