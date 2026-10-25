// ProdOps — developed by Lulamile Mkhungela.
//
// What did the builder actually ask for?
//
// Every archetype pack carries a whole product: a marketplace pack knows about
// sellers, listings, orders, payouts, disputes and workspace settings. Compiling
// all of it produced exactly the complaint that started this file — "I see
// Control room, what is it for?" — because a builder who typed one sentence
// about township artisans got an ops dashboard, a payout run and a dispute desk
// they never mentioned, presented as their own product.
//
// So the pack is now a vocabulary, not a plan. A section compiles when:
//
//   1. the pack marks it `core` — the spine without which a product of this
//      kind cannot function (a marketplace without sellers is not a
//      marketplace), or
//   2. the builder's own words name it, or name the thing it is built on.
//
// Everything else is listed, not compiled, and the Product stage shows it under
// "not in your brief" with a one-click add. Nothing is hidden: the builder can
// see what the pack would have given them and decide, which is the difference
// between a scoped product and a fabricated one.
//
// Same text in, same scope out — this is a pure function of the description and
// the pack, so the package stays reproducible.

import type { Pack } from './packTypes'
import type { ScopeDecision } from '../types'

/** Words too common to prove anything about scope. */
const NOISE = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'that', 'this', 'from', 'into', 'about', 'their', 'there',
  'they', 'them', 'our', 'your', 'its', 'it', 'is', 'are', 'be', 'been', 'was', 'were', 'will', 'would',
  'can', 'could', 'should', 'must', 'has', 'have', 'had', 'do', 'does', 'did', 'not', 'but', 'also', 'just',
  'one', 'two', 'all', 'any', 'each', 'every', 'some', 'more', 'most', 'than', 'then', 'when', 'where',
  'which', 'who', 'whom', 'how', 'why', 'what', 'while', 'need', 'needs', 'want', 'wants', 'make',
  'makes', 'build', 'builds', 'let', 'lets', 'help', 'helps', 'tool', 'app', 'application', 'platform',
  'system', 'software', 'product', 'site', 'website', 'service', 'solution', 'page', 'pages', 'user',
  'users', 'people', 'person', 'someone', 'thing', 'things', 'way', 'ways', 'new', 'own', 'simple',
  'small', 'internal', 'external', 'better', 'across', 'per', 'via', 'out', 'up', 'down', 'over', 'under',
  'off', 'on', 'in', 'to', 'of', 'at', 'by', 'as', 'so', 'if', 'we', 'i', 'you', 'my', 'me', 'us', 'same',
  'needs', 'like', 'use', 'uses', 'using', 'used', 'day', 'days', 'today', 'time', 'times', 'work', 'works',
])

/** Crude but stable singularisation, so "sellers" matches "seller". */
function normal(word: string): string {
  const w = word.toLowerCase()
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 4 && w.endsWith('es') && /(ch|sh|ss|x|z)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

/** The words in a piece of text worth comparing, singularised and de-duplicated. */
export function scopeWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !NOISE.has(w))
    .map(normal)
  return [...new Set(words)]
}

/** Everything a section is *about*, in the builder's vocabulary. */
function sectionWords(pack: Pack, id: string): Set<string> {
  const section = pack.sections.find((s) => s.id === id)
  const words = new Set<string>()
  if (!section) return words
  // A section is identified by its own name, purpose, jobs and screens — not by
  // the entities it happens to read. Control room touches orders and payouts,
  // but a builder who says "payout" is asking for Payouts, not for an ops
  // dashboard, so entity descriptions must not count as evidence.
  const text = [
    section.name,
    section.purpose,
    ...(section.extraJobs ?? []),
    ...section.screens.map((s) => s.name),
  ].join(' ')
  for (const word of scopeWords(text)) words.add(word)
  return words
}

export interface ScopeOptions {
  /** Sections the builder added by hand. Wins over every rule. */
  include?: string[]
  /** Sections the builder removed by hand. Wins over every rule. */
  exclude?: string[]
}

/**
 * Decide which of the pack's sections belong in this product.
 *
 * Returns every section in the pack with `included` and a plain-English `why`,
 * so the Product stage can show both halves honestly — what was compiled and
 * what was left out — instead of pretending the leftovers never existed.
 */
export function readScope(pack: Pack, idea: string, options: ScopeOptions = {}): ScopeDecision[] {
  const wanted = scopeWords(idea)
  // With no description there is nothing to read: the builder picked the
  // archetype themselves, so the pack stands as chosen.
  const unread = wanted.length < 2
  const include = new Set(options.include ?? [])
  const exclude = new Set(options.exclude ?? [])

  // A word that shows up in most of the pack's sections proves nothing about
  // this product — every marketplace section mentions "marketplace". Evidence
  // has to be distinctive to count.
  const frequency = new Map<string, number>()
  for (const section of pack.sections) {
    for (const word of sectionWords(pack, section.id)) frequency.set(word, (frequency.get(word) ?? 0) + 1)
  }
  const ceiling = Math.max(2, Math.ceil(pack.sections.length / 2))
  // The pack's label is the archetype's own name, not this builder's words:
  // "marketplace" says which pack this is, never which section they want.
  const packWords = new Set(scopeWords([pack.label, pack.category].join(' ')))
  const evidence = new Set(
    wanted.filter((word) => !packWords.has(word) && (frequency.get(word) ?? 0) < ceiling),
  )

  return pack.sections.map((section) => {
    if (exclude.has(section.id)) {
      return { id: section.id, name: section.name, included: false, why: 'You removed this from the scope.' }
    }
    if (include.has(section.id)) {
      return { id: section.id, name: section.name, included: true, why: 'You added this to the scope.' }
    }
    if (unread) {
      return { id: section.id, name: section.name, included: true, why: 'Part of the pack you chose.' }
    }
    if (section.core) {
      return {
        id: section.id,
        name: section.name,
        included: true,
        why: `Standard for ${pack.label.toLowerCase()}.`,
      }
    }
    const words = sectionWords(pack, section.id)
    const matched = [...evidence].filter((word) => words.has(word))
    // A word in the section's own name is evidence on its own ("payout" →
    // Payouts). Elsewhere in its text, one loose word is a coincidence — two
    // are a request.
    const named = [...evidence].some((word) => scopeWords(section.name).includes(word))
    if (matched.length && (named || matched.length >= 2)) {
      return {
        id: section.id,
        name: section.name,
        included: true,
        why: `You wrote “${matched.slice(0, 3).join('”, “')}”.`,
      }
    }
    return {
      id: section.id,
      name: section.name,
      included: false,
      why: 'Nothing in your description asks for this yet.',
    }
  })
}

/** The ids `readScope` keeps — what `compileSections` compiles. */
export function scopeIds(decisions: ScopeDecision[]): string[] {
  return decisions.filter((d) => d.included).map((d) => d.id)
}
