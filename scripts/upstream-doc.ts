/**
 * Write the upstream review to the repo and to the exported package.
 *
 *   npm run upstream-doc
 *
 * One source of truth (`src/export/upstream.ts`) and two readers: a human
 * opening `docs/UPSTREAM-REVIEW.md`, and a coding agent that receives the
 * package and wants to know which upstream versions the files in it came from.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { upstreamReviewMarkdown } from '../src/export/upstream'

const markdown = upstreamReviewMarkdown()
mkdirSync('docs', { recursive: true })
writeFileSync('docs/UPSTREAM-REVIEW.md', `${markdown}\n`)
console.log(`docs/UPSTREAM-REVIEW.md — ${(markdown.length / 1024).toFixed(1)} KB`)
