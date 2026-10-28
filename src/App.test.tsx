import { chooseBackend } from './App'

describe('chooseBackend', () => {
  it('honours VITE_STORE, else api in production and local in development', () => {
    expect(chooseBackend({ VITE_STORE: 'local', PROD: true })).toBe('local')
    expect(chooseBackend({ VITE_STORE: 'api', PROD: false })).toBe('api')
    expect(chooseBackend({ PROD: true })).toBe('api')
    expect(chooseBackend({ PROD: false })).toBe('local')
    expect(chooseBackend({ VITE_STORE: 'supabase', PROD: false })).toBe('local')
  })
})
