import type { Project } from '../types'
import type { PackageFile } from './package'
import { screenScreenshot } from './screenshots'
import { AGENT_OS_COMMANDS } from './vendor/agentOsCommands'
import { DESIGN_OS_SKILL } from './vendor/designOsCommands'

/**
 * Agent OS parity — cloned from github.com/buildermethods/agent-os (MIT).
 *
 * Agent OS is *not* the Design OS four-step product-design process. It is a
 * standards-and-spec layer that sits in the target codebase:
 *
 *   agent-os/product/{mission,roadmap,tech-stack}.md   ← /plan-product
 *   agent-os/standards/<folder>/<name>.md + index.yml  ← /discover-standards, /index-standards
 *   agent-os/specs/<YYYY-MM-DD-HHMM>-<slug>/           ← /shape-spec
 *     {plan,shape,references,standards}.md + visuals/
 *   .claude/commands/agent-os/*.md                     ← installed commands (verbatim)
 *   config.yml                                         ← version + default profile
 *
 * File names, folder rules, index format and spec-folder structure follow the
 * real command definitions, not an approximation of them.
 */

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface Standard {
  folder: string
  name: string
  description: string
  body: string
}

function standards(project: Project): Standard[] {
  const design = project.design
  const registry = project.system.components
  const primary = design.colors.find((c) => c.role === 'primary') ?? design.colors[0]
  const example = `bg-[var(--${primary?.id ?? 'primary'})] text-[var(--ink)] rounded-[var(--radius-md)] p-[var(--space-md)]`

  return [
    {
      folder: 'accessibility',
      name: 'a11y-baseline',
      description: 'Labels, focus, contrast and keyboard paths are not optional',
      body: `# a11y-baseline

## Rule

- Labels on every control; \`aria-label\` on icon-only buttons.
- Visible focus ring on everything focusable.
- Text contrast ≥ 4.5:1 — tokens carry \`onWhite\`/\`onInk\` ratios from the compiler.
- Colour is never the only signal for status; badges carry text.
- Tab order matches visual order.

## Why

The token set was compiled with contrast ratios, so a failing component is a component that ignored its tokens.`,
    },
    {
      folder: 'data',
      name: 'data-contract',
      description: 'Components take data as props; only the data layer imports fixtures',
      body: `# data-contract

## Rule

- Components accept \`rows\` and callbacks. No \`fetch\`, no global store, no \`import\` of sample data.
- The repository interface is the only thing that changes when the backend lands.
- Mock rows live in \`src/data/mock-adapter.ts\` (${project.data.entities.length} entities, ${project.data.entities.reduce((n, e) => n + e.rows.length, 0)} rows).

## Why

The prototype must become production without a rewrite. A component that imports fixtures cannot.`,
    },
    {
      folder: 'global',
      name: 'tech-stack',
      description: 'Project tech stack: React + Tailwind frontend, PostgreSQL data, generated design system',
      body: techStackBody(project),
    },
    {
      folder: 'quality',
      name: 'tests-first',
      description: 'Write the section test spec as failing tests before implementing',
      body: `# tests-first

## Rule

Each section ships \`tests.md\`. Convert it to real tests, watch them fail, then implement.

- Every screen: renders with sample data, empty state, keyboard path.
- Every flow: one end-to-end test.
- Assert what the user sees, not internals.

## Why

Tests written after the fact describe what was built. Written first they describe what was asked for.`,
    },
    {
      folder: 'quality',
      name: 'states-and-empty',
      description: 'Empty, loading and error states are part of done',
      body: `# states-and-empty

## Rule

Every list, table and form needs: loading skeleton, empty state with a next step, error state with a retry.

## Why

Half a real product's surface is the data that is not there yet.`,
    },
    {
      folder: 'ui',
      name: 'components-from-registry',
      description: 'Build screens only from the component registry; no hand-rolled one-offs',
      body: `# components-from-registry

## Rule

Every element on a screen comes from \`system/registry.md\` (${registry.length} components). If something is missing, add it to the registry first, then use it.

${bullets(registry.slice(0, 12).map((c) => `\`${c.name}\` — ${c.group}; variants: ${c.variants.join(', ')}`))}

## Why

Hand-crafted screens drift: two button paddings, three greys, four badge radii. States are generated from variant axes, not drawn one by one.`,
    },
    {
      folder: 'ui',
      name: 'real-controls',
      description: 'Interactive elements are real inputs, buttons, selects and links',
      body: `# real-controls

## Rule

- Every field is \`<input>\`, \`<textarea>\` or \`<select>\`, with a \`<label>\` bound by \`htmlFor\`.
- Required fields are marked and validated on submit with an inline message.
- Buttons are \`<button type="button">\` unless they submit a form.
- Focus is always visible (\`box-shadow: var(--shadow-focus)\`).

## Why

A prototype with a styled \`div\` where an input belongs cannot be typed into, submitted or tested. It is a picture of software.`,
    },
    {
      folder: 'ui',
      name: 'responsive-by-default',
      description: `Mobile-first layout at ${design.breakpoints.map((b) => `${b.name}:${b.px}`).join(' ')}, no horizontal scroll`,
      body: `# responsive-by-default

## Rule

- Mobile first; add \`sm:\`/\`md:\`/\`lg:\` at the tokens below.
- No horizontal scrolling at any width.
- Navigation collapses to a drawer below \`md\`.
- Touch targets: 44×44px minimum.

${bullets(design.breakpoints.map((b) => `\`${b.name}\` — ${b.px}px`))}

## Why

A design that only exists at 1440px is not a design. Breakpoints are part of the token file and of the audit.`,
    },
    {
      folder: 'ui',
      name: 'tokens-only-styling',
      description: 'Never write a raw colour, radius, spacing or font value in a component',
      body: `# tokens-only-styling

## Rule

Style from tokens. A raw hex, px radius or font stack in a component is a defect.

\`\`\`tsx
// yes
<button className="${example}">Save</button>

// no
<button className="bg-[#${(primary?.base ?? '#c4471b').replace('#', '')}] rounded-lg p-3">Save</button>
\`\`\`

## Why

The design system is generated: ${design.colors.length} colour families × 11 stops, ${design.spacing.length} space steps, radii ${Object.values(design.radii).join('/')}px. Editing a token must restyle every screen without a code change. Semantic names (\`--ink\`, \`--surface\`, \`--primary\`) are the only names a component may use.`,
    },
  ]
}

function techStackBody(project: Project): string {
  const frontend = project.system.stack.filter((s) => /Framework|Registry|Chart/i.test(s.layer))
  const data = project.system.stack.filter((s) => /Data|Database/i.test(s.layer))
  return `# Tech Stack

## Frontend

${bullets(frontend.map((s) => `${s.choice} ${s.version} — ${s.reason}`))}
- Tailwind CSS v4 reading \`design-system/tokens.css\`
- Components from \`shell/components\` and \`sections/*/components\`

## Backend

Not prescribed. The UI is props-based, so any backend works — keep the repository interface in \`src/data/repository.ts\` and implement it server-side.

## Database

${bullets(data.map((s) => `${s.choice} ${s.version} — ${s.reason}`))}
- Schema: \`schema.sql\` (${project.data.entities.length} tables, ${project.data.relationships.length} foreign keys)
`
}

function indexYml(list: Standard[]): string {
  const folders = Array.from(new Set(list.map((s) => s.folder))).sort()
  const lines = [
    '# Agent OS standards index.',
    '# Structure: folder → file-name (no .md) → description.',
    '# /inject-standards matches against these descriptions without reading the files.',
    '',
  ]
  for (const folder of folders) {
    lines.push(`${folder}:`)
    for (const standard of list.filter((s) => s.folder === folder).sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`  ${standard.name}:`, `    description: ${standard.description}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function productDocs(project: Project): PackageFile[] {
  const design = project.design
  const mvp = project.roadmap.phases[0]
  const later = project.roadmap.phases.slice(1)

  return [
    {
      path: 'agent-os/product/mission.md',
      content: `# Product Mission

## Problem

${project.brief.problems.map((p) => `**${p.title}.** ${p.detail} _Cost of inaction: ${p.cost}_`).join('\n\n')}

## Target Users

${project.brief.personas.map((p) => `- **${p.name}** — ${p.role}, ${p.segment}. Goal: ${p.goal}. Pain: ${p.pain}.`).join('\n')}

## Solution

${project.brief.elevator}

${project.brief.differentiators.map((d) => `- **${d.title}** — ${d.detail}`).join('\n')}

## Success Measures

${bullets(project.brief.metrics.map((m) => `${m.label}: ${m.target} (${m.why})`))}

## Non-Goals

${bullets(project.brief.nonGoals)}
`,
    },
    {
      path: 'agent-os/product/roadmap.md',
      content: `# Product Roadmap

## Phase 1: MVP

${bullets((mvp?.sectionIds ?? project.sections.map((s) => s.id)).map((id) => {
  const section = project.sections.find((s) => s.id === id)
  return `**${section?.name ?? id}** — ${section?.purpose ?? ''}`
}))}

${mvp ? bullets(mvp.outcomes) : ''}

## Phase 2: Post-Launch

${later.length
  ? later
      .map(
        (phase) => `${bullets(phase.outcomes)}

Sections: ${phase.sectionIds.map((id) => project.sections.find((s) => s.id === id)?.name ?? id).join(', ')}`,
      )
      .join('\n\n')
  : 'To be determined.'}

## Sequencing

${project.roadmap.sequencingNote}
`,
    },
    {
      path: 'agent-os/product/tech-stack.md',
      content: `${techStackBody(project)}
## Other

- Design tokens: W3C DTCG JSON (\`design-system/tokens.dtcg.json\`) + CSS custom properties
- Breakpoints: ${design.breakpoints.map((b) => `${b.name} ${b.px}px`).join(' · ')}
- Repository + mock adapter pattern for the data layer
`,
    },
    {
      path: 'agent-os/config.yml',
      content: `version: 3.0
default_profile: default
`,
    },
    {
      path: 'agent-os/README.md',
      content: `# Agent OS

Cloned from [buildermethods/agent-os](https://github.com/buildermethods/agent-os) (MIT), filled in from this product.

## Agent OS is not Design OS

Design OS runs the four-step product-design process (Product Planning → Design System → Section Design → Export). **Agent OS has no such flow.** It is a lightweight standards-and-spec system that lives in the target codebase so an agent builds the way your team builds:

| Agent OS command | Here |
| --- | --- |
| \`/plan-product\` | \`agent-os/product/{mission,roadmap,tech-stack}.md\` |
| \`/discover-standards\` | \`agent-os/standards/<folder>/*.md\` |
| \`/index-standards\` | \`agent-os/standards/index.yml\` (folder → file → description) |
| \`/inject-standards\` | \`specs/*/standards.md\` inlines the rules that apply |
| \`/shape-spec\` | \`agent-os/specs/<YYYY-MM-DD-HHMM>-<slug>/{plan,shape,references,standards}.md\` + \`visuals/\` |

The five commands are installed verbatim at \`.claude/commands/agent-os/\`.

## Install

\`\`\`bash
cp -R agent-os/ /path/to/your-app/agent-os
cp -R .claude/commands/agent-os /path/to/your-app/.claude/commands/
\`\`\`

Then run \`/plan-product\` to confirm or replace these docs, and \`/shape-spec\` for the next feature.

## The loop

1. **Discover** — \`index.yml\` lists what the code must do, one line per rule for cheap matching.
2. **Inject** — read the matching files, or \`specs/*/standards.md\`, which inlines them.
3. **Build** — follow \`instructions/\` milestones and the per-section plans.
4. **Refine** — edit the standard, re-run the audit, re-export.
`,
    },
  ]
}

function specFiles(project: Project): PackageFile[] {
  const stamp = new Date(project.updatedAt)
  const date = `${stamp.toISOString().slice(0, 10)}-${String(stamp.getUTCHours()).padStart(2, '0')}${String(stamp.getUTCMinutes()).padStart(2, '0')}`
  const list = standards(project)

  return project.sections.flatMap((section, index) => {
    const folder = `agent-os/specs/${date}-${slug(section.name)}`
    const flows = project.flows.filter((f) => f.steps.some((s) => s.sectionId === section.id))
    const entityNames = section.entityIds.map((id) => project.data.entities.find((e) => e.id === id)?.name ?? id)
    const relevant = list.filter(
      (standard) =>
        standard.folder === 'ui' ||
        (standard.folder === 'data' && entityNames.length > 0) ||
        (standard.name === 'tech-stack') ||
        (section.screens.some((s) => s.blocks.some((b) => b.type === 'form')) && standard.folder === 'accessibility'),
    )

    return [
      {
        path: `${folder}/shape.md`,
        content: `# ${section.name} — Shaping Notes

## Scope

${section.purpose}

Screens:

${bullets(section.screens.map((s) => `**${s.name}** — \`${s.route}\` (${s.kind}). ${s.intent}`))}

In scope:

${bullets(section.requirements.filter((r) => r.priority !== 'could').map((r) => `${r.text} _(${r.priority})_`))}

Out of scope:

${bullets(section.outOfScope)}

## Decisions

- Compose the section from \`sections/${section.id}/components/\`; do not restyle them.
- Data arrives as props; the repository interface is the seam to the backend.
- States (empty, loading, error) are implemented with the section, not after it.
- Priority: ${section.priority}.

## Context

- **Visuals:** \`visuals/\` — ${section.screens.length} rendered screens at 1280×800, drawn from the same tokens as the live prototype.
- **References:** \`shell/components/AppShell.tsx\`; \`sections/${project.sections.find((s) => s.id !== section.id && s.screens.length > 0)?.id ?? 'first-section'}/components/\`; \`data-shapes/overview.ts\`.
- **Product alignment:** ${project.brief.metrics[0]?.label ?? 'see mission.md'} targeted at ${project.brief.metrics[0]?.target ?? 'the launch metric'}; ${section.priority} scope on the roadmap.

## Standards Applied

${bullets(relevant.map((s) => `\`${s.folder}/${s.name}\` — ${s.description}`))}
`,
      },
      {
        path: `${folder}/plan.md`,
        content: `# ${section.name} — Plan

Milestone ${String(index + 2).padStart(2, '0')} of the implementation. Task 1 saves this spec before any code is written.

## Task 1: Save Spec Documentation

Write \`agent-os/specs/${date}-${slug(section.name)}/\` with:

- **plan.md** — this file
- **shape.md** — scope, decisions, context
- **standards.md** — the standards that apply, in full
- **references.md** — the files to study first
- **visuals/** — ${section.screens.length} screen renders

## Task 2: Types

Copy \`sections/${section.id}/types.ts\` into the app's type module (\`src/types\` or similar).

## Task 3: Data

Wire ${entityNames.join(', ') || 'the section'} through \`src/data/repository.ts\`; use \`mock-adapter.ts\` for the first pass.

## Task 4: Components

Drop in ${section.screens.length} component(s) from \`sections/${section.id}/components/\`. Import paths only; no restyling.

## Task 5: Routes

Mount ${section.screens.map((s) => `\`${s.route}\``).join(', ')} inside \`AppShell\`.

## Task 6: States and interactions

- Empty, loading and error for every data surface.
- Interactions: ${section.screens.flatMap((s) => s.blocks.filter((b) => ['filters', 'form', 'detail', 'board'].includes(b.type)).map((b) => b.type)).join(', ') || 'navigation only'}.

## Task 7: Tests

Implement \`sections/${section.id}/tests.md\`; all green before review.

## Task 8: Review

The standards in \`standards.md\` are the review checklist.

## Risks

${bullets(section.screens.flatMap((s) => s.states.map((state) => `${s.name}: ${state.name} — ${state.detail}`)).slice(0, 6))}
`,
      },
      {
        path: `${folder}/references.md`,
        content: `# References for ${section.name}

## Similar Implementations

### Application shell

- **Location:** \`shell/components/AppShell.tsx\`
- **Relevance:** every screen renders inside it; navigation and content width come from here
- **Key patterns:** layout-only component, nav labels from the shell spec, \`aria-current\` on the active item

### Sibling section

- **Location:** \`sections/${project.sections.find((s) => s.id !== section.id && s.screens.length > 0)?.id ?? 'first-section'}/components/\`
- **Relevance:** same composition pattern, different entities
- **Key patterns:** props-only components, sample data outside the component, callbacks wired by the page

### Data contracts

- **Location:** \`data-shapes/overview.ts\` and \`sections/${section.id}/types.ts\`
- **Relevance:** the props the components expect
- **Key patterns:** entities are plain interfaces; no classes, no ORM types

## Flows to keep working

${flows.length ? flows.map((f) => `- **${f.name}** (${f.persona}) — ${f.steps.map((s) => s.title).join(' → ')}. Success: ${f.success}`).join('\n') : '- No flow crosses this section yet.'}
`,
      },
      {
        path: `${folder}/standards.md`,
        content: `# Standards for ${section.name}

The following standards apply to this work.

${relevant
  .map((standard) => `---\n\n## ${standard.folder}/${standard.name}\n\n${standard.body}`)
  .join('\n\n')}
`,
      },
      ...section.screens.map((screen) => ({
        path: `${folder}/visuals/${slug(screen.name)}.svg`,
        content: screenScreenshot(project, section, screen),
      })),
      {
        path: `${folder}/visuals/README.md`,
        content: `# Visuals — ${section.name}

${section.screens.map((s) => `- \`${slug(s.name)}.svg\` — ${s.name} at 1280×800`).join('\n')}

Rendered from the compiled blocks and design tokens, so they never drift from the prototype.
`,
      },
    ]
  })
}

function skills(project: Project): PackageFile[] {
  const design = project.design
  return [
    {
      // Design OS's own skill, vendored byte for byte.
      path: '.claude/skills/frontend-design/SKILL.md',
      content: DESIGN_OS_SKILL,
    },
    {
      // The project-specific continuation of it: the compiled tokens, registry
      // and breakpoints this product actually ships.
      path: '.claude/skills/project-design-system/SKILL.md',
      content: `---
name: project-design-system
description: Compose ${project.name} screens from the generated design system and registry. Use when building or reviewing any UI.
---

# ${project.name} design system skill

## Tokens

- Colours: \`var(--primary)\`, \`var(--accent)\`, \`var(--ink)\`, \`var(--ink-muted)\`, \`var(--surface)\`, \`var(--surface-2)\`, \`var(--border)\`, \`var(--border-strong)\`
- Type: \`--font-display\`, \`--font-body\`, \`--font-mono\` (${design.typography.map((t) => t.family).join(', ')})
- Radius: ${Object.entries(design.radii).map(([k, v]) => `\`--radius-${k}\` ${v}px`).join(', ')}
- Space: ${design.spacing.map((s) => `\`--space-${s.name}\` ${s.px}px`).join(', ')}
- Breakpoints: ${design.breakpoints.map((b) => `\`${b.name}\` ${b.px}px`).join(', ')}

## Standards to include

- @agent-os/standards/ui/tokens-only-styling.md
- @agent-os/standards/ui/components-from-registry.md
- @agent-os/standards/ui/real-controls.md
- @agent-os/standards/ui/responsive-by-default.md
- @agent-os/standards/accessibility/a11y-baseline.md

## Composition rules

1. Start from \`shell/components/AppShell.tsx\`; never rebuild the frame.
2. Pick components from the registry. If it is not there, add it to the registry first.
3. One primary action per screen.
4. Data is props; callbacks are wired by the page.
5. Real controls only. No clickable divs, no fake inputs.

## Review checklist

- No raw hex, px radius, or font stack in the diff.
- Every interactive element is focusable and labelled.
- Empty, loading and error states exist for every data surface.
- Layout holds at ${design.breakpoints.map((b) => `${b.px}px`).join(', ')} without horizontal scroll.
`,
    },
  ]
}

export function buildAgentOs(project: Project): PackageFile[] {
  const list = standards(project)
  const files: PackageFile[] = []

  files.push(...productDocs(project))
  for (const standard of list) {
    files.push({
      path: `agent-os/standards/${standard.folder}/${standard.name}.md`,
      content: `# ${standard.name}\n\n${standard.description}\n\n${standard.body}\n`,
    })
  }
  files.push({ path: 'agent-os/standards/index.yml', content: indexYml(list) })
  files.push(...specFiles(project))
  files.push(...skills(project))

  for (const command of AGENT_OS_COMMANDS) {
    files.push({ path: `.claude/commands/agent-os/${command.name}.md`, content: command.content })
  }

  return files
}
