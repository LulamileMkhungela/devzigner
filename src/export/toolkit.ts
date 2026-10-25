/**
 * The free-tools half of the handoff.
 *
 * Everything the ProdOps toolkit ships is installed where the agents canon
 * convention says it belongs: real files in `.agents/skills/`, instructions in
 * `AGENTS.md`, and a one-line script that creates the symlinks the holdout tools
 * (Claude Code) need. The skill files are vendored verbatim — not rewritten.
 */
import type { Project } from '../types'
import type { PackageFile } from './package'
import { TOOLS } from '../tools'
import { TOOLKIT } from './vendor/toolkit'

const header = `# Agent instructions — PROJECT

PROJECT is a PRODUCT built from a ProdOps handoff: a compiled design system, a
UI contract, a working API and a test suite. Read this before changing anything.

## Where things live

| Path | What it is |
| --- | --- |
| \`src/\` | the prototype UI, assembled from registry components |
| \`src/data/\` | the data-layer interface and the two adapters (mock, HTTP) |
| \`server/\` | the business logic and the API, with its own tests |
| \`sections/\` | per-section props contracts, sample data and screenshots |
| \`design-system/\` | tokens (CSS + DTCG), typography, Tailwind notes |
| \`shell/\` | the app shell components |
| \`standards/\` | product docs, indexed standards, specs |
| \`.agents/skills/\` | the canonical skills (agents canon) |
| \`.agents/commands/\` | the fifteen ProdOps slash commands |

## Rules

1. **Tokens only.** No raw hex, no px radius, no ad-hoc font stacks. Everything is
   in \`design-system/tokens.css\`.
2. **Registry components only.** If a screen needs something that is not in the
   registry, add it there first.
3. **Status is a journey.** Change it through \`POST /api/:entity/:id/transition\`,
   never with a PATCH.
4. **Every write is validated.** The server rejects unknown fields, bad enums and
   dangling relations with a 422 that names the field.
5. **Tests first.** \`cd server && npm test\` must pass before a milestone is done.
6. **Skills live in \`.agents/skills/\`.** Never add a real skill under \`.claude/skills\`;
   that path is a symlink.
`

const linker = `#!/usr/bin/env bash
# agents canon: one real copy, symlinks for the tools that look elsewhere.
set -euo pipefail
root="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if [ -e CLAUDE.md ] && [ ! -L CLAUDE.md ]; then
  echo "CLAUDE.md exists and is not a symlink; merging is a human decision" >&2
  exit 1
fi
ln -sfn AGENTS.md CLAUDE.md

mkdir -p .claude
if [ -e .claude/skills ] && [ ! -L .claude/skills ]; then
  echo ".claude/skills exists and is not a symlink; move its contents into .agents/skills first" >&2
  exit 1
fi
rm -rf .claude/skills
ln -sfn ../.agents/skills .claude/skills

echo "canon wired: CLAUDE.md -> AGENTS.md, .claude/skills -> .agents/skills"
ls -l CLAUDE.md .claude/skills
`

function favicon(project: Project): string {
  const primary = project.design.colors.find((c) => c.role === 'primary') ?? project.design.colors[0]
  const ink = primary.contrastText
  const initial = project.name.trim().charAt(0).toUpperCase() || 'D'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${project.name}">
  <rect width="64" height="64" rx="14" fill="${primary.base}" />
  <text x="32" y="43" text-anchor="middle" font-family="DM Sans, system-ui, sans-serif" font-size="34" font-weight="700" fill="${ink}">${initial}</text>
</svg>
`
}

/** PRD Creator's output: one locked PRD plus a prompt per milestone. */
function prdPlan(project: Project): PackageFile[] {
  const files: PackageFile[] = []
  const stack = project.system.stack
  const sections = project.sections
  const milestoneNames = [
    `1-core-${(sections[0]?.id ?? 'app').split('-')[0]}`,
    '2-workflows',
    '3-polish-and-launch',
  ]
  const chunks = [sections.slice(0, 2), sections.slice(2, Math.max(3, sections.length - 1)), sections.slice(Math.max(2, sections.length - 1))]
  const stackLines = stack.map((layer) => `- **${layer.layer}:** ${layer.choice} — ${layer.reason}`).join('\n')
  const entityLines = project.data.entities
    .map((entity) => `- **${entity.name}** — ${entity.description} Fields: ${entity.fields.map((f) => `\`${f.name}\` (${f.type})`).join(', ')}.`)
    .join('\n')
  const featureLines = sections.map((section) => `- **${section.name}** — ${section.purpose} Ships ${section.screens.map((s) => `\`${s.route}\``).join(', ')}.`).join('\n')
  const outOfScope = sections.flatMap((section) => section.outOfScope.map((item) => `- ${item}`)).join('\n')
  const integrations = ['Email — transactional notifications (provider: to be chosen by the builder)', 'Payments — not required by the compiled scope', 'Storage — object storage only if screenshots or uploads are added']

  files.push({
    path: '_build_plan/prd.md',
    content: `# ${project.name} — Product Requirements Document

> Locked by PRD Creator. The source of truth for every milestone prompt in this folder.

## What we're building

${project.brief.elevator}

Built for ${project.brief.personas.map((p) => `${p.name} (${p.role})`).join(', ')}.

## Core features

${featureLines}

## Out of scope for v1

${outOfScope || '- Nothing is explicitly excluded yet — decide this before milestone 1.'}

## Tech stack

${stackLines}

The prototype is React + Tailwind. The reference API in \`server/\` is dependency-free TypeScript on Node's \`http\` module, with its own test suite.

## External integrations and credentials

${integrations.map((line) => `- ${line}`).join('\n')}

## Data model

${entityLines}

## Per-feature scope

${sections
  .map(
    (section) => `### ${section.name}

**In scope:** ${section.requirements.filter((r) => r.priority !== 'could').map((r) => r.text).join(' ')}
**Not in scope:** ${section.outOfScope.join(' ')}`,
  )
  .join('\n\n')}

## Milestones

${milestoneNames
  .map(
    (name, index) => `### ${index + 1}. ${name.replace(/^\d+-/, '').replace(/-/g, ' ')}

${chunks[index].length ? `Sections: ${chunks[index].map((s) => s.name).join(', ')}.` : 'Final pass: empty states, responsive checks, accessibility and the launch checklist.'}
Done when the routes render with real data and the flows for these sections work end to end.`,
  )
  .join('\n\n')}

## Done when

- Every section in \`sections/\` renders with real data
- Every flow in \`flows.md\` completes without a dead end
- Empty, loading and error states exist for every data surface
- \`cd server && npm test\` passes
`,
  })

  chunks.forEach((chunk, index) => {
    files.push({
      path: `_build_plan/milestones/${milestoneNames[index]}/prompt.md`,
      content: `# Milestone ${index + 1}: ${milestoneNames[index].replace(/^\d+-/, '').replace(/-/g, ' ')}

Read \`_build_plan/prd.md\` first. Read any prior \`milestone-log.md\` files in this
folder so you build on what already exists.

## Scope

${chunk.length ? chunk.map((section) => `- **${section.name}** — ${section.purpose}`).join('\n') : '- Final pass across every section: empty states, responsive behaviour, accessibility, and the launch checklist.'}

## Plan first

Enter plan mode, restate the scope, list the files you will touch, and wait for
approval. Implement only what is in scope for this milestone.

## Verify against "Done when"

- The milestone's routes render with the real data layer
- The flows for these sections complete end to end
- Empty, loading and error states exist
- Tests pass (\`npm test\` where a suite exists)

## Log it

Write \`_build_plan/milestones/${milestoneNames[index]}/milestone-log.md\` with what
was built, decisions made, conventions introduced and any deviation from the PRD.
`,
    })
  })

  return files
}

export function buildToolkit(project: Project): PackageFile[] {
  const files: PackageFile[] = []
  const push = (path: string, content: string) => files.push({ path, content: content.endsWith('\n') ? content : content + '\n' })

  for (const tool of TOOLKIT) {
    for (const file of tool.files) {
      push(file.path, file.content)
    }
  }

  push('AGENTS.md', header.replace(/PROJECT/g, project.name).replace(/PRODUCT/g, project.brief.tagline))
  push(
    'CLAUDE.md',
    `Refer to @AGENTS.md

This file is a placeholder until \`scripts/link-agents.sh\` runs. agents canon makes it
a symlink to AGENTS.md, so there is exactly one copy of the instructions.
`,
  )
  push('scripts/link-agents.sh', linker)
  push('favicon.svg', favicon(project))
  files.push(...prdPlan(project))

  const rows = TOOLS.map(
    (tool, index) => `| ${index + 1} | **${tool.name}** | ${tool.kind} | ${tool.ships} |`,
  ).join('\n')

  // Each step names the file it runs from, so the list can be checked against
  // the package rather than trusted: `steps/write-files.md` either exists or it
  // does not.
  const steps = TOOLS.map(
    (tool) =>
      `### ${tool.name}\n\n${tool.blurb}\n\n${tool.steps
        .map((step, i) => {
          const file = tool.stepFiles?.[i]
          return `${i + 1}. ${step}${file ? ` — \`${file}\`` : ''}`
        })
        .join('\n')}\n`,
  ).join('\n')

  push(
    'TOOLKIT.md',
    `# The builder toolkit — all eight free tools

These are the eight free tools for builders, installed in this repo rather
than linked from a browser tab. The skill files are
vendored verbatim from their repositories, so a coding agent runs the real process,
not a summary of it.

| # | Tool | Kind | Installed at |
| --- | --- | --- | --- |
${rows}

## The convention they follow

\`agents canon\`: skills live once, in \`.agents/skills/\`. Instructions live once, in
\`AGENTS.md\`. \`CLAUDE.md\` and \`.claude/skills\` are symlinks, created by:

\`\`\`bash
./scripts/link-agents.sh
\`\`\`

## Steps, as the tools define them

${steps}
## Which of them this repo runs itself

- **ProdOps** produced the artefacts in this package. Its ten commands are in
  \`.agents/commands/prodops/\` if you want to re-run a phase conversationally.
- **Standards** produced \`standards/product\`, \`standards/standards\` and the specs. Its
  five commands are in \`.agents/commands/prodops/\`.
- **PRD Creator** has already run: \`_build_plan/prd.md\` is the locked PRD and
  \`_build_plan/milestones/<n>-<name>/prompt.md\` is one prompt per milestone. Start a
  session with the first prompt and write its milestone log before moving on.
- **Design System** re-scaffolds the design-system page inside a React + Tailwind
  codebase if you would rather start from its primitives.
- **Favicon Creator** needs \`rsvg-convert\` and \`magick\` on the machine. This package
  ships \`favicon.svg\` — the same square, tight-radius, centred-initial rule the skill
  uses — so there is a working icon before the full set is generated.
- **Build New** is a Rails starter: use it when the target is a Rails + React app.
  The template's instructions and agent setup are in \`template/starter/\`.
- **Skill Builder** writes new skills to \`.agents/skills/\`.
- **agents canon** is the convention the rest of them assume.

## Checks

There is no service to run for the skills themselves — they are files an agent
reads. The things that *do* run are the server tests and the UI build:

\`\`\`bash
cd server && npm test     # domain rules + API behaviour
npm run build             # the UI
\`\`\`
`,
  )

  return files
}
