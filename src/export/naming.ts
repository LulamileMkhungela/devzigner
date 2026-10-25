/**
 * One implementation of the naming rules, shared by every emitter.
 *
 * The React components live in `handoff.ts` and the other framework adapters in
 * `frameworks/index.ts`; if the two disagreed about a component's name the
 * section's `index.ts` would point at a file that does not exist. They both
 * import from here instead.
 */
import type { Screen, Section } from '../types'

export function pascal(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

export function camel(value: string): string {
  const p = pascal(value)
  return p[0]?.toLowerCase() + p.slice(1)
}

export function kebab(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function componentName(section: Section, screen: Screen): string {
  const sectionName = pascal(section.name)
  const screenName = pascal(screen.name)
  return sectionName && screenName.startsWith(sectionName) ? screenName : `${sectionName}${screenName}`
}
