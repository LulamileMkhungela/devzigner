import type { IncomingMessage } from 'node:http'

/** Accept user-supplied secrets only over HTTPS, or loopback HTTP during local development. */
export function secureCredentialOrigin(req: IncomingMessage): boolean {
  try {
    const origin = new URL(req.headers.origin || '')
    return origin.host === req.headers.host && (origin.protocol === 'https:' || origin.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(origin.hostname))
  } catch { return false }
}
export function validCredential(value: unknown): value is string {
  return typeof value === 'string' && /^[\x21-\x7e]{8,512}$/.test(value)
}
export function validModel(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(value)
}
