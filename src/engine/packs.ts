import type { Pack } from './packTypes'
import { marketplace, saas, crm, learning, clinic, fintech } from './packs1'
import { logistics, creator, property, fieldops, peopleops, events } from './packs2'
import type { ArchetypeSummary } from '../types'

export const PACKS: Pack[] = [
  marketplace,
  saas,
  crm,
  learning,
  clinic,
  fintech,
  logistics,
  creator,
  property,
  fieldops,
  peopleops,
  events,
]

export function getPack(id: string): Pack {
  return PACKS.find((p) => p.id === id) ?? marketplace
}

export const ARCHETYPES: ArchetypeSummary[] = PACKS.map((p) => ({
  id: p.id,
  label: p.label,
  category: p.category,
  blurb: p.blurb,
}))

export type { Pack }
