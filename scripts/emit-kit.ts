/**
 * Writes the installer's toolkit to disk.
 *
 * Every `cp -r prodops/…` line in the Installation section of the eight tool
 * pages names a path in this repository. This script is what makes those paths
 * real: it materialises the vendored instructions (the four skills, the agents
 * canon skills, the starter template, the fifteen ProdOps commands) as ordinary
 * files, so that
 *
 *     git clone https://github.com/LulamileMkhungela/devzigner.git prodops
 *     cp -r prodops/.agents/skills/prd-creator/ ~/.agents/skills/
 *
 * works on a fresh clone, and so the docs are *applied* here rather than only
 * quoted on a page. It is idempotent: re-running rewrites identical bytes.
 *
 *     npm run kit
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PHASE_COMMANDS, PHASE_SKILL } from '../src/export/vendor/phaseCommands'
import { LICENSES } from '../src/export/licenses'
import { STANDARDS_COMMANDS } from '../src/export/vendor/standardsCommands'
import { TOOLKIT } from '../src/export/vendor/toolkit'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let written = 0
let unchanged = 0

function write(path: string, content: string) {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  if (existsSync(target) && readFileSync(target, 'utf8') === content) {
    unchanged++
    return
  }
  writeFileSync(target, content)
  written++
}

/* 1. The eight tools' own files. Paths are already where the installation
      section copies from, so they are taken as written. */
for (const tool of TOOLKIT) {
  for (const file of tool.files) write(file.path, file.content)
}

/* 2. The ten Design OS commands, as the agent executes them. */
for (const command of PHASE_COMMANDS) {
  write(`.agents/commands/prodops/${command.name}.md`, command.content)
}

/* 3. The five Agent OS commands: discover, index, inject, plan, shape. */
for (const command of STANDARDS_COMMANDS) {
  write(`.agents/commands/prodops/${command.name}.md`, command.content)
}

/* 4. The frontend-design skill the design phases lean on. */
write('.agents/skills/frontend-design/SKILL.md', PHASE_SKILL)

/* 5. The standards layer: the scaffold `/discover-standards` fills in. It is
      copied whole (`cp -r prodops/standards/ .`), so the files say what belongs
      in each one and stop short of inventing a product. */
const STANDARDS: { path: string; content: string }[] = [
  {
    path: 'standards/config.yml',
    content: `version: 3.0
default_profile: default
`,
  },
  {
    path: 'standards/README.md',
    content: `# Standards

Standards is the second layer of ProdOps: conventions that live in the target
codebase so an agent builds the way the product builds. It is not a flow — it
records the rules the code has to keep, and makes them available to every later
task.

| Command | Writes |
| --- | --- |
| \`/discover-standards\` | \`standards/standards/<folder>/*.md\` — one standard per convention, read from the code |
| \`/index-standards\` | \`standards/standards/index.yml\` — the index an agent scans first |
| \`/inject-standards\` | the matching standards into the task in front of you |
| \`/plan-product\` | \`standards/product/mission.md\`, \`roadmap.md\`, \`tech-stack.md\` |
| \`/shape-spec\` | \`standards/specs/<feature>/\` — the spec a milestone is built against |

Run them from the project this folder was copied into; they write to the
project, never back into the folder they came from.
`,
  },
  {
    path: 'standards/product/mission.md',
    content: `# Product Mission

## Problem

What breaks today, for whom, and what it costs them. Written by \`/plan-product\`
from the product brief — keep the same headings and it stays readable to an agent.

## Target Users

One line per persona: who they are, what they are trying to do, what gets in the
way.

## Solution

The one-sentence version of what this product does about it.

## Success Measures

Numbers, with the target and why it matters.

## Non-Goals

What this product deliberately does not do.
`,
  },
  {
    path: 'standards/product/roadmap.md',
    content: `# Product Roadmap

## Phase 1: MVP

The sections that ship first, in build order, and the outcome each one is judged
by.

## Phase 2: Post-Launch

What waits, and what would have to be true to start it.

## Sequencing

Why this order and not another.
`,
  },
  {
    path: 'standards/product/tech-stack.md',
    content: `# Tech Stack

## Framework

The stack this product is built on. ProdOps does not require React: the export
targets React, Vue, Svelte and plain HTML from the same specification.

## Database

The tables, the relationships, the status fields, and the migration order.

## Design tokens

W3C DTCG JSON (\`design-system/tokens.dtcg.json\`) plus CSS custom properties —
the same tokens the Design stage writes.

## Other

Breakpoints, the repository + mock adapter pattern for the data layer, and any
convention a new file has to follow.
`,
  },
  {
    path: 'standards/standards/index.yml',
    content: `# Written by /discover-standards and /index-standards.
# One entry per standard, so an agent can find the rule without reading the repo.
standards: []
`,
  },
  {
    path: 'standards/specs/README.md',
    content: `# Specs

One folder per feature, written by \`/shape-spec\`: the requirements, the edge
cases, the data it touches and the acceptance checks. The Sections stage of the
ProdOps workspace writes the same shape per section (\`shape.md\`, \`plan.md\`).
`,
  },
]

for (const file of STANDARDS) write(file.path, file.content)

/* 6. The licence notices. `.agents/`, `standards/` and `template/` carry
      redistributed MIT material, and MIT requires the notice to travel with
      every copy — which now includes this checkout, not only the export. */
write('LICENSES.md', LICENSES.replace('`../LICENSE`', '`LICENSE`'))

/* 7. The repo-level instructions, written for whoever — or whatever — works in
      this checkout next. It states the two contexts, the five stages, and where
      the commands live, so an agent reads the same flow the app enforces. */
write(
  'AGENTS.md',
  `# ProdOps — agent instructions

ProdOps is a product-planning workspace: it turns an idea into a specified,
designed, exportable product without asking the builder for a model, a key or
an account. This file is the entry point for any agent working in this repo.

Credit: Product and build by Lulamile Mkhungela.

## Two contexts

1. **The ProdOps app** — \`src/\` (React 19, TypeScript, Vite). This is the tool
   the builder uses; its views are the five stages.
2. **A product being built** — the exported package (\`product-plan/\`,
   \`sections/\`, \`shell/\`, \`standards/\`, \`server/\`). Nothing in \`src/\` is part
   of a user's product, and a user's product is never written back into \`src/\`.

## The five stages, and the commands behind them

| Stage | Command | Writes |
| --- | --- | --- |
| Product | \`/product-vision\`, \`/product-roadmap\` | \`product/product-overview.md\`, \`product-roadmap.md\`, \`_build_plan/prd.md\` |
| Data Shape | \`/data-shape\` | \`data-shape/data-shape.md\`, \`schema.sql\` |
| Design | \`/design-tokens\`, \`/design-shell\` | \`design-system/colors.json\`, \`typography.json\`, \`product/shell/spec.md\` |
| Sections | \`/shape-section\`, \`/sample-data\`, \`/design-screen\`, \`/screenshot-design\` | \`sections/<name>/shape.md\`, \`plan.md\`, \`references.md\`, \`standards.md\`, \`visuals/\` |
| Export | \`/export-product\` | \`product-plan/\` — the whole handoff |

Commands live in \`.agents/commands/prodops/\`; skills in \`.agents/skills/\`.
Standards set-up (\`/discover-standards\`, \`/index-standards\`, \`/inject-standards\`,
\`/plan-product\`, \`/shape-spec\`) is in the same folder.

## Rules the app enforces, and so should you

- **No keys, no data, no model.** Everything here is local and deterministic.
- **A stage ticks only when it is confirmed**, never merely because its
  artefacts exist. Complete is not the same as done.
- **One decision at a time, with a proposed default and its reasoning.**
- **The brief is a *what* document.** No libraries, method names or retry
  strategies in it; those belong to the plan for each milestone.
- **Guidance, never a dead end.** After any rebuild, say what to do next.

## Commands

\`\`\`bash
npm run dev           # the workspace on :5173
npm run preview:site  # the site capture on :5173
npm run check         # rendering, site, unit, export, walkthrough, smoke, build
npm run kit           # rewrite the toolkit files above
\`\`\`
`,
)

/* 8. The symlink script the agents-canon tool documents. */
write(
  'scripts/link-agents.sh',
  `#!/usr/bin/env bash
# Point every tool at one canonical home.
#
#   .agents/skills/   the real skills
#   .claude/skills    -> ../.agents/skills
#   AGENTS.md         the real instructions
#   CLAUDE.md         -> AGENTS.md
#
# Safe to re-run: an existing correct link is left alone, and a real directory
# is never deleted — the script says what it found and stops.
set -euo pipefail
cd "$(dirname "$0")/.."

link() {
  local target="$1" at="$2"
  if [ -L "$at" ]; then
    [ "$(readlink "$at")" = "$target" ] && { echo "ok   $at -> $target"; return; }
    rm "$at"
  elif [ -e "$at" ]; then
    echo "skip $at exists and is not a symlink — move it yourself" >&2
    return
  fi
  mkdir -p "$(dirname "$at")"
  ln -s "$target" "$at"
  echo "link $at -> $target"
}

link ../.agents/skills .claude/skills
link AGENTS.md CLAUDE.md
`,
)
chmodSync(join(root, 'scripts/link-agents.sh'), 0o755)

console.log(`kit: ${written} written, ${unchanged} already current`)
