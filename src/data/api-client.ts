/** Thin fetch wrapper for the app's own API: same-origin cookies, CSRF header, JSON errors → Error(code). */

export interface ApiClientOptions {
  /** '' in the browser (same origin); an absolute origin in tests. */
  baseUrl?: string
  fetch?: typeof fetch
}

export class ApiError extends Error {
  status: number
  constructor(status: number, code: string) {
    super(code)
    this.status = status
  }
}

export interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T = void>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  put(path: string, body: unknown): Promise<void>
  del(path: string): Promise<void>
}

export function createApiClient(opts: ApiClientOptions = {}): ApiClient {
  const base = opts.baseUrl ?? ''
  const f = opts.fetch ?? ((input, init) => fetch(input, init))

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json', 'x-requested-with': 'slugger' }
    if (body !== undefined) headers['content-type'] = 'application/json'
    let res: Response
    try {
      res = await f(`${base}/api${path}`, {
        method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, 'OFFLINE')
    }
    if (res.status === 204) return undefined as T
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    if (!res.ok) {
      const code = typeof data === 'object' && data && 'error' in data ? String((data as { error: unknown }).error) : `HTTP_${res.status}`
      throw new ApiError(res.status, code)
    }
    return data as T
  }

  return {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b ?? {}),
    patch: (p, b) => request('PATCH', p, b),
    put: (p, b) => request('PUT', p, b),
    del: (p) => request('DELETE', p),
  }
}
