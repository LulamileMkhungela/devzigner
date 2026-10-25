// ProdOps — developed by Lulamile Mkhungela.
//
// "Has the builder described anything yet?"
//
// One question, asked in one place. A project that has not been described has
// no brief, no data shape, no design system, no sections, no screens and no
// flows — the compiler keeps the shape of a project so nothing has to special-
// case `undefined`, but the workspace shows none of it until there is an idea.
//
// The rule is the description itself rather than a count of sections: a builder
// who has typed a sentence and then removed every section has still started, and
// deserves the real pages with their empty states, not the "describe your
// product" wall.

import type { Project } from '../types'

/** True once the builder has described a product. */
export function started(project: Project): boolean {
  return Boolean(project.idea && project.idea.trim().length >= 8)
}

/**
 * Where the builder is in the process, as one sentence, for the empty state.
 * Deliberately not "0% complete": nothing is complete and nothing is broken.
 */
export function startPrompt(project: Project): string {
  return started(project)
    ? 'Nothing in this stage yet.'
    : 'Describe the product on the Product stage and this fills in from your words.'
}
