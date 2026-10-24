import type { Project, Section, Screen, Version } from '../types'
import { formatCurrency } from '../lib/format'
import { buildSystemFiles } from './systemFiles'
import { buildHandoff } from './handoff'
import { buildAgentOs } from './agentos'
import { buildCommands, buildPlanning } from './commands'

export interface PackageFile {
  path: string
  content: string
}

function bullet(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

function screenMarkdown(screen: Screen, project: Project): string {
  const lines: string[] = [
    `### ${screen.name}`,
    '',
    `- **Route:** \`${screen.route}\``,
    `- **Screen type:** ${screen.kind}`,
    `- **Intent:** ${screen.intent}`,
    `- **Entities:** ${screen.entityIds.join(', ')}`,
    '',
    '**Blocks (top to bottom)**',
    '',
  ]
  for (const block of screen.blocks) {
    switch (block.type) {
      case 'pageHeader':
        lines.push(`1. \`pageHeader\` — "${block.title}"; subtitle "${block.subtitle}"; actions: ${block.actions.join(', ') || 'none'}`)
        break
      case 'stats':
        lines.push(`1. \`stats\` — ${block.items.map((i) => `${i.label} (${i.value})`).join(' · ')}`)
        break
      case 'chart':
        lines.push(`1. \`chart:${block.kind}\` — "${block.title}" · ${block.labels.length} points`)
        break
      case 'filters':
        lines.push(`1. \`filters\` — chips: ${block.chips.join(', ')}; search placeholder "${block.search}"`)
        break
      case 'table':
        lines.push(`1. \`table\` — ${block.caption}; columns: ${block.columns.join(', ')}`)
        break
      case 'list':
        lines.push(`1. \`list\` — "${block.title}" using meta field ${block.metaField}`)
        break
      case 'detail':
        lines.push(`1. \`detail\` — ${block.tabs.length} tabs (${block.tabs.join(', ')}), ${block.fields.length} fields`)
        break
      case 'form':
        lines.push(`1. \`form\` — "${block.title}"; fields: ${block.fields.join(', ')}; submit "${block.submit}"`)
        break
      case 'board':
        lines.push(`1. \`board\` — ${block.columns.map((c) => `${c.name} (${c.cards.length})`).join(' · ')}`)
        break
      case 'timeline':
        lines.push(`1. \`timeline\` — "${block.title}" · ${block.events.length} events`)
        break
      case 'calendar':
        lines.push(`1. \`calendar\` — ${block.month} · ${block.events.length} placed items`)
        break
      case 'activity':
        lines.push(`1. \`activity\` — "${block.title}" · ${block.items.length} items`)
        break
      case 'profile':
        lines.push(`1. \`profile\` — ${block.name}, ${block.role}`)
        break
      case 'map':
        lines.push(`1. \`map\` — "${block.title}" · ${block.pins.length} pins; legend: ${block.legend.join(', ')}`)
        break
      case 'steps':
        lines.push(`1. \`steps\` — "${block.title}": ${block.steps.map((s) => `${s.title} [${s.state}]`).join(' → ')}`)
        break
      case 'split':
        lines.push(`1. \`split\` — "${block.leftTitle}" / "${block.rightTitle}" (${block.bullets.length} guardrails)`)
        break
      case 'callout':
        lines.push(`1. \`callout:${block.tone}\` — "${block.title}"`)
        break
      case 'empty':
        lines.push(`1. \`empty\` — "${block.title}"`)
        break
      default:
        lines.push(`1. \`${(block as { type: string }).type}\``)
    }
  }
  lines.push('', '**States**', '', bullet(screen.states.map((s) => `**${s.name}** — ${s.detail}`)), '')
  lines.push('**Acceptance criteria**', '', bullet(screen.acceptance), '')
  if (screen.entityIds.length) {
    const entity = project.data.entities.find((e) => e.id === screen.entityIds[0])
    if (entity) {
      lines.push(`**Sample data source:** \`${entity.plural}\` (${entity.rows.length} seeded rows)`, '')
    }
  }
  return lines.join('\n')
}

function sectionMarkdown(section: Section, project: Project): string {
  const lines: string[] = [
    `# ${section.name}`,
    '',
    `${section.purpose}`,
    '',
    `- **Priority:** ${section.priority}`,
    `- **Screens:** ${section.screens.length}`,
    `- **Entities:** ${section.entityIds.join(', ')}`,
    '',
    '## Jobs to be done',
    '',
    bullet(section.jobs),
    '',
    '## Requirements',
    '',
    '| ID | Priority | Requirement |',
    '| --- | --- | --- |',
    ...section.requirements.map((r) => `| ${r.id} | ${r.priority} | ${r.text.replace(/\|/g, '\\|')} |`),
    '',
    '## Screens',
    '',
    ...section.screens.map((s) => screenMarkdown(s, project)),
    '## Test instructions',
    '',
    bullet(section.tests),
    '',
  ]
  if (section.outOfScope.length) {
    lines.push('## Explicitly out of scope', '', bullet(section.outOfScope), '')
  }
  return lines.join('\n')
}

export function buildPackage(project: Project, versions: Version[] = []): PackageFile[] {
  const { brief, data, design, sections, roadmap, audit } = project
  const files: PackageFile[] = []
  const stamp = new Date(project.updatedAt).toISOString().slice(0, 10)

  files.push({
    path: 'README.md',
    content: `# ${project.name} — design & build package

Generated by **Lula DevZign** on ${stamp}, deterministically from seed \`${project.seed}\` and the \`${project.archetypeId}\` archetype. No model calls were made to produce this package: every word, token and data row is computed locally.

## What is in here

| File | Purpose |
| --- | --- |
| \`product-brief.md\` | Problem, personas, jobs, metrics, differentiators, risks, non-goals |
| \`roadmap.md\` | Sequenced phases with outcomes and section mapping |
| \`data-model.md\` + \`schema.sql\` | Entities, fields, relationships and a runnable PostgreSQL schema |
| \`design-system.md\` + \`tokens.css\` + \`tailwind-theme.css\` + \`tokens.json\` | Colours, type, spacing, radii, motion, layout and tokens |
| \`components.md\` | Component inventory with states and behaviour |
| \`screens.md\` | Every designed screen with blocks, states and acceptance criteria |
| \`sections/*.md\` | One spec per feature area, including its tests |
| \`tests.md\` | All test instructions, consolidated |
| \`agent-implementation-brief.md\` | The prompt to hand a coding agent, in build order |
| \`audit.md\` | The ${audit.checks.length}-point consistency and accessibility audit |
| \`devzign.json\` | The exact seed/genome used, so this package can be regenerated |
| \`product-overview.md\` | Product, users and roadmap in one page — pairs with Design OS's file of the same name |
| \`prompts/\` | One-shot and per-section prompts to paste into a coding agent |
| \`instructions/\` | One-shot instructions plus incremental milestones (01 shell, then one per section) |
| \`sections/<id>/components/\` | Copy-paste React components — props-based, responsive, no data imports |
| \`sections/<id>/tests.md\` | Framework-agnostic test instructions per section |
| \`design-system/tokens.dtcg.json\` | W3C DTCG token file for Figma, Tokens Studio and other tools |
| \`specs/<id>/\` | Requirements, plan and task breakdown per section |
| \`agent-os/\` | Agent OS layer: product docs, indexed standards, persistent specs, design skill |
| \`product/\` + \`commands/\` | Design OS planning outputs and the slash commands that produce them |

## How to use it

1. Copy the folder into your repository (or reference it from a \`/docs\` folder).
2. Paste \`agent-implementation-brief.md\` into your coding agent **before** asking it to build.
3. Follow the roadmap phases. Do not skip the schema step.
4. Apply \`tokens.css\` first, then build components against those variables only.
5. Use \`tests.md\` for TDD: the statements are framework-agnostic.

## Reproducibility

\`\`\`json
{
  "seed": ${project.seed},
  "archetype": "${project.archetypeId}",
  "genome": ${JSON.stringify(project.genome)},
  "currency": "${project.currency}"
}
\`\`\`

Re-running those values in Lula DevZign produces a byte-identical package.

## Honest limits

This package is a **design and engineering brief**, not user research. Personas and quotes are illustrative and labelled as such. Metrics are directional targets, not benchmarks. Validate the problem with real conversations before you build the roadmap.
`,
  })

  files.push({
    path: 'product-brief.md',
    content: `# ${brief.name} — product brief

**Category:** ${brief.category}
**Tagline:** ${brief.tagline}

${brief.elevator}

## Summary

${brief.summary}

## Problems

${brief.problems.map((p, i) => `### ${i + 1}. ${p.title}\n\n${p.detail}\n\n*Cost of inaction:* ${p.cost}`).join('\n\n')}

## Personas

${brief.personas
  .map(
    (p) => `### ${p.name} — ${p.role}\n\n*${p.segment}*\n\n- **Goal:** ${p.goal}\n- **Pain:** ${p.pain}\n- **In their words:** “${p.quote}”`,
  )
  .join('\n\n')}

> ${brief.personas[0]?.quoteTruth ?? ''}

## Jobs to be done

${bullet(brief.jobs)}

## Success metrics

| Metric | Target | Why it matters |
| --- | --- | --- |
${brief.metrics.map((m) => `| ${m.label} | ${m.target} | ${m.why} |`).join('\n')}

## Differentiators

${brief.differentiators.map((d) => `**${d.title}** — ${d.detail}`).join('\n\n')}

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
${brief.risks.map((r) => `| ${r.risk} | ${r.mitigation} |`).join('\n')}

## Product principles

${bullet(brief.principles)}

## Voice

**Tone:** ${brief.voice.tone}

- Say: ${brief.voice.say.join(', ')}
- Avoid: ${brief.voice.avoid.join(', ')}

## Non-goals

${bullet(brief.nonGoals)}

## Integrations in scope

${bullet(brief.integrations)}
`,
  })

  files.push({
    path: 'roadmap.md',
    content: `# ${project.name} — roadmap

${roadmap.sequencingNote}

${roadmap.phases
  .map(
    (p) => `## ${p.name} · ${p.horizon}

**Goal:** ${p.goal}

**Outcomes**
${bullet(p.outcomes)}

**Sections:** ${p.sectionIds.map((id) => sections.find((s) => s.id === id)?.name ?? id).join(', ')}

**Main risk:** ${p.risk}
`,
  )
  .join('\n')}
`,
  })

  files.push({
    path: 'data-model.md',
    content: `# ${project.name} — data model

${data.notes.map((n) => `- ${n}`).join('\n')}

## Relationships

| From | To | Kind | Via |
| --- | --- | --- | --- |
${data.relationships.map((r) => `| ${r.from} | ${r.to} | ${r.kind} | ${r.via ?? '—'} |`).join('\n')}

## Entities

${data.entities
  .map(
    (e) => `### ${e.name} (\`${e.id}\`)

${e.description}

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
${e.fields
  .map(
    (f) =>
      `| \`${f.name}\` | ${f.type}${f.options ? ` (${f.options.join(' · ')})` : ''} | ${f.required ? 'yes' : 'no'} | ${String(f.example).slice(0, 42)} | ${(f.note ?? '').replace(/\|/g, '\\|')} |`,
  )
  .join('\n')}

*${e.rows.length} sample rows seeded for prototyping.*
`,
  )
  .join('\n')}

## Enumeration constraints

All \`status\` fields are stored as text with a check constraint so a new state is a data change, not a migration lock.
`,
  })

  files.push({ path: 'schema.sql', content: data.sql })

  files.push({
    path: 'design-system.md',
    content: `# ${design.name}

**Mood:** ${design.mood.join(' · ')}

${design.rationale}

## Layout

- **Shell:** ${design.layout.shell}
- **Navigation:** ${design.layout.nav.join(' · ')}
- **Content width:** ${design.layout.contentWidth}px
- **Card style:** ${design.layout.cardStyle}
- **Density:** ${design.layout.density}
- **Grid:** ${design.layout.grid}

## Colour

${design.colors
  .map(
    (c) => `### ${c.name} — \`${c.base}\` (${c.role})

${c.rationale}

| Step | Hex | On white | On ink |
| --- | --- | --- | --- |
${c.stops.map((s) => `| ${s.step} | \`${s.hex}\` | ${s.onWhite}:1 | ${s.onInk}:1 |`).join('\n')}

Text on base: \`${c.contrastText}\``,
  )
  .join('\n\n')}

## Semantic tokens

| Token | Light | Dark |
| --- | --- | --- |
${Object.entries(design.semantic).map(([k, v]) => `| \`${k}\` | ${v} | — |`).join('\n')}

## Typography

${design.typography
  .map(
    (t) => `### ${t.role} — ${t.family}

\`\`\`css
font-family: ${t.stack};
font-size: ${t.size};
line-height: ${t.lineHeight};
letter-spacing: ${t.tracking};
\`\`\`

Weights: ${t.weights.join(', ')}. ${t.usage}`,
  )
  .join('\n\n')}

## Type scale

| Token | Size | Usage |
| --- | --- | --- |
${design.scale.map((s) => `| ${s.name} | ${s.px}px | ${s.usage} |`).join('\n')}

## Radius

${Object.entries(design.radii).map(([k, v]) => `- \`--radius-${k}\`: ${v}px`).join('\n')}

## Spacing

${design.spacing.map((s) => `- \`--space-${s.name}\`: ${s.px}px`).join('\n')}

## Elevation

${Object.entries(design.shadows).map(([k, v]) => `- \`--shadow-${k}\`: ${v}`).join('\n')}

## Motion

| Token | Duration | Easing | Usage |
| --- | --- | --- | --- |
${design.motion.map((m) => `| ${m.name} | ${m.duration} | ${m.easing} | ${m.usage} |`).join('\n')}

## Rules

- Never use a raw hex value in a component. Use a token.
- Never introduce a radius or shadow that is not in this file.
- Status colours are reserved: green means confirmed, amber means approaching, red means failed or destructive.
- Tables use tabular numerals (\`font-variant-numeric: tabular-nums\`).
`,
  })

  files.push({ path: 'tokens.css', content: design.tokensCss })
  files.push({ path: 'tailwind-theme.css', content: design.tailwindTheme })
  files.push({ path: 'tokens.json', content: design.tokensJson })

  files.push({
    path: 'components.md',
    content: `# ${project.name} — component inventory

Every component below must be built from tokens only. Status: all **specified**, none implemented — this is the handoff contract.

${design.components
  .map(
    (c, i) => `## ${i + 1}. ${c}

- **Purpose:** ${describeComponent(c)}
- **States:** default, hover, focus-visible, disabled, loading, error
- **Rules:** keyboard reachable; focus ring uses \`--shadow-focus\`; no colour-only signalling.
`,
  )
  .join('\n')}

## Status pill mapping

| Semantic | Token | Use |
| --- | --- | --- |
| Success | \`var(--success-soft)\` / \`var(--success)\` | Confirmed, paid, delivered, complete |
| Warning | \`var(--warning-soft)\` / \`var(--warning)\` | Approaching threshold, pending review |
| Danger | \`var(--danger-soft)\` / \`var(--danger)\` | Failed, overdue, destructive |
| Info | \`var(--info-soft)\` / \`var(--info)\` | Neutral guidance |

## Data table contract

- Sticky header, 44px minimum row height at roomy density, 36px at compact.
- Column set and order are user-configurable and persisted per user.
- Right-align numeric columns; use tabular numerals.
- Bulk selection shows a contextual action bar that replaces the page header actions.
`,
  })

  files.push({
    path: 'screens.md',
    content: `# ${project.name} — screens

${sections
  .map(
    (s) => `## ${s.name}

${s.purpose}

${s.screens.map((sc) => screenMarkdown(sc, project)).join('\n')}`,
  )
  .join('\n')}

## Navigation

| Section | Route base | Screens |
| --- | --- | --- |
${sections.map((s) => `| ${s.name} | \`/${s.id}\` | ${s.screens.map((sc) => sc.name).join(', ')} |`).join('\n')}
`,
  })

  for (const section of sections) {
    files.push({ path: `sections/${section.id}.md`, content: sectionMarkdown(section, project) })
  }

  files.push({
    path: 'tests.md',
    content: `# ${project.name} — test instructions

Framework-agnostic. Write the failing test first, then build until it passes. These describe **what** to verify, not how.

## Cross-cutting

- Every screen is reachable by keyboard, with a visible focus indicator.
- Every list has loading, empty and error states, each with its own test.
- No component hard-codes a colour, radius or spacing value.
- The workspace works at 375px with no horizontal scroll on primary content.
- All dates render in the workspace timezone; test one record near midnight UTC.

${sections
  .map(
    (s) => `## ${s.name}

${bullet(s.tests)}

**Data setup:** seed at least 5 ${data.entities.find((e) => e.id === s.entityIds[0])?.plural.toLowerCase() ?? 'records'}, including one in a failing or at-risk state and one with no optional fields.
`,
  )
  .join('\n')}
`,
  })

  files.push({
    path: 'audit.md',
    content: `# ${project.name} — design audit

**Score: ${audit.score}/100.** ${audit.summary}

| Check | Group | Status | Detail |
| --- | --- | --- | --- |
${audit.checks.map((c) => `| ${c.label} | ${c.group} | ${c.status.toUpperCase()} | ${c.detail.replace(/\|/g, '\\|')} |`).join('\n')}

## How this is scored

Pass = full weight, warning = half weight, fail = zero. Weights favour the checks that break a build (contrast, schema, section coverage). Re-generate after changing the genome to see the score move.
`,
  })

  files.push({
    path: 'agent-implementation-brief.md',
    content: `# Implementation brief for a coding agent

You are implementing **${project.name}**, a ${brief.category.toLowerCase()} product. Read this whole file before writing code. Do not invent scope; if something is missing, ask one question and proceed with the documented default.

## Non-negotiables

1. Use the design tokens in \`tokens.css\` / \`tailwind-theme.css\`. No raw hex codes.
2. Build the schema in \`schema.sql\` first. Every screen reads real tables — no hard-coded arrays in components.
3. Every list screen has loading, empty and error states. Empty states include the primary action.
4. Status pill colours come from the semantic mapping, never from a local variable.
5. Forms validate on blur and on submit, preserve input on failure, and are idempotent.
6. Server-side authorisation on every mutation. Hide destructive actions from viewers.

## Build order

${roadmap.phases
  .map(
    (p, i) => `${i + 1}. **${p.name}** — ${p.sectionIds.map((id) => sections.find((s) => s.id === id)?.name ?? id).join(', ')}\n   - ${p.outcomes[0]}\n   - ${p.outcomes[1] ?? 'Ship behind a feature flag and verify with seeded data.'}`,
  )
  .join('\n')}

## Per-screen rules

${sections
  .map(
    (s) => `### ${s.name}

${s.screens.map((sc) => `- **${sc.name}** (\`${sc.route}\`): ${sc.intent} Must-haves: ${sc.acceptance.slice(0, 2).join(' ')}`).join('\n')}`,
  )
  .join('\n')}

## Definition of done

- \`schema.sql\` applies cleanly on an empty database and seeds sample data.
- Every requirement marked **must** in \`sections/*.md\` is implemented and covered by a test.
- Design audit items stay at pass or above; if you must deviate, note it in \`DECISIONS.md\`.
- Bundle is usable on a 375px viewport and with a keyboard only.
- No unused design tokens are added; no component exceeds 200 lines.

## What not to do

${bullet(brief.nonGoals)}

## Need clarification?

Ask about **one** thing at a time: authentication provider, tenancy model, or deployment target. Everything else is already decided in this package.
`,
  })

  files.push({
    path: 'devzign.json',
    content: JSON.stringify(
      {
        generatedBy: 'Lula DevZign',
        version: 1,
        product: project.name,
        generatedAt: new Date(project.updatedAt).toISOString(),
        reproduce: {
          seed: project.seed,
          archetypeId: project.archetypeId,
          genome: project.genome,
          currency: project.currency,
          moduleSeeds: project.moduleSeeds,
          idea: project.idea,
        },
        audit: { score: project.audit.score, checks: project.audit.checks.length },
        counts: {
          sections: sections.length,
          screens: sections.reduce((n, s) => n + s.screens.length, 0),
          entities: data.entities.length,
          requirements: sections.reduce((n, s) => n + s.requirements.length, 0),
          tests: sections.reduce((n, s) => n + s.tests.length, 0),
        },
        files: files.map((f) => f.path),
      },
      null,
      2,
    ),
  })

  files.push(...buildSystemFiles(project, versions))
  files.push(...buildHandoff(project))
  files.push(...buildAgentOs(project))
  files.push(...buildCommands(project))
  files.push(...buildPlanning(project))

  return files
}

function describeComponent(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('button')) return 'Primary, secondary, ghost and destructive actions with loading and disabled states.'
  if (lower.includes('input') || lower.includes('select')) return 'Data capture with inline validation, helper text and error recovery.'
  if (lower.includes('table')) return 'Dense record browsing with sorting, selection, sticky header and column configuration.'
  if (lower.includes('card')) return 'Grouped content and KPI summaries with a single primary action.'
  if (lower.includes('badge') || lower.includes('pill')) return 'Compact semantic status with a non-colour cue for accessibility.'
  if (lower.includes('drawer')) return 'Record detail without losing list context; deep-linkable and dismissible with Escape.'
  if (lower.includes('tab')) return 'View switching that preserves scroll and filter state.'
  if (lower.includes('toast') || lower.includes('banner')) return 'Non-blocking feedback with an undo path for destructive actions.'
  if (lower.includes('filter')) return 'Composable filters reflected in the URL and saved per user.'
  if (lower.includes('chart')) return 'Accessible data visualisation with a table fallback and explicit windows.'
  return 'Interface pattern defined by the design system.'
}

export function packageSizeKb(files: PackageFile[]): number {
  const bytes = files.reduce((n, f) => n + new Blob([f.content]).size, 0)
  return Math.round(bytes / 1024)
}

export function moneyLabel(value: number, project: Project): string {
  return formatCurrency(value, project.currency)
}
