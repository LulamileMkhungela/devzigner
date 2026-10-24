import type { Project } from '../types'
import type { PackageFile } from './package'
import { screenScreenshot } from './screenshots'

/**
 * Agent OS parity.
 *
 * Agent OS is a standards + spec-driven workflow: product docs
 * (`agent-os/product/`), documented standards with an index
 * (`agent-os/standards/`), and persistent specs
 * (`agent-os/specs/YYYY-MM-DD-HHMM-slug/{plan,shape,references,standards}.md`).
 *
 * Everything here is derived from the compiled product, so the standards are
 * the ones the exported code actually follows, and every spec carries the
 * real screenshots, the flow it implements and the standards that apply.
 */

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface Standard {
  domain: string
  name: string
  description: string
  body: string
}

function standards(project: Project): Standard[] {
  const design = project.design
  const registry = project.system.components
  const primary = design.colors.find((c) => c.role === 'primary') ?? design.colors[0]
  const tokensExample = [
    `bg-[var(--${primary?.id ?? 'primary'})]`,
    'text-[var(--ink)]',
    'rounded-[var(--radius-md)]',
    'p-[var(--space-md)]',
  ].join(' ')

  return [
    {
      domain: 'ui',
      name: 'tokens-only-styling',
      description: 'Never write a raw colour, radius, spacing or font value in a component.',
      body: `## Rule

Style from tokens. A raw hex, px radius or font stack in a component is a defect.

\`\`\`tsx
// yes
<button className="${tokensExample}">Save</button>

// no
<button className="bg-[#${(primary?.base ?? '#c4471b').replace('#', '')}] rounded-lg p-3">Save</button>
\`\`\`

## Why

The design system is generated: ${design.colors.length} colour families × 11 stops, ${design.spacing.length} space steps, radii ${Object.values(design.radii).join('/')}px. Editing a token must restyle every screen without a code change. Raw values break that contract — this is the exact failure mode of "dumb" variables in design tools.

Semantic names (\`--ink\`, \`--surface\`, \`--primary\`) are the only names a component may use; ramp steps (\`--primary-${primary?.stops[5]?.step ?? 500}\`) are for token authoring and charts only.`,
    },
    {
      domain: 'ui',
      name: 'components-from-registry',
      description: 'Build screens only from the component registry; do not hand-roll one-off elements.',
      body: `## Rule

Every element on a screen comes from \`system/registry.md\` (${registry.length} components). If something is missing, add it to the registry first, then use it.

${bullets(registry.slice(0, 12).map((c) => `\`${c.name}\` — ${c.group}; variants: ${c.variants.join(', ')}`))}

## Why

Hand-crafted screens drift: two button paddings, three greys, four badge radii. States are generated from the variant axes, not drawn one by one — the reason a design tool needs hundreds of hand-made variants is that it has no axes.`,
    },
    {
      domain: 'ui',
      name: 'real-controls',
      description: 'Interactive elements are real inputs, buttons, selects and links.',
      body: `## Rule

- Every field is \`<input>\`, \`<textarea>\` or \`<select>\`, with a \`<label>\` bound by \`htmlFor\`.
- Required fields are marked and validated on submit with an inline message.
- Buttons are \`<button type="button">\` unless they submit a form.
- Focus is always visible (\`box-shadow: var(--shadow-focus)\`).

## Why

A prototype with a styled \`div\` where an input belongs cannot be typed into, cannot be submitted and cannot be tested. It is a picture of software, and it is the single most common way a design handoff loses a day.`,
    },
    {
      domain: 'ui',
      name: 'responsive-by-default',
      description: `Lay out at ${design.breakpoints.map((b) => `${b.name}:${b.px}`).join(' ')} and never below 360px.`,
      body: `## Rule

- Mobile first; add \`sm:\`/\`md:\`/\`lg:\` at the tokens below.
- No horizontal scrolling at any width.
- Navigation collapses to a drawer below \`md\`.
- Touch targets: 44×44px minimum.

${bullets(design.breakpoints.map((b) => `\`${b.name}\` — ${b.px}px`))}

## Why

A design that only exists at 1440px is not a design. Breakpoints are part of the token file (\`--breakpoint-*\`) and of the audit.`,
    },
    {
      domain: 'data',
      name: 'data-contract',
      description: 'Components take data as props; only the data layer imports fixtures.',
      body: `## Rule

- Components accept \`rows\` and callbacks. No \`fetch\`, no global store, no \`import\` of sample data.
- The repository interface is the only thing that changes when the backend lands.
- Mock rows live in \`src/data/mock-adapter.ts\` (${project.data.entities.length} entities, ${project.data.entities.reduce((n, e) => n + e.rows.length, 0)} rows).

## Why

The prototype must be able to become production without a rewrite. A component that imports fixtures cannot.`,
    },
    {
      domain: 'quality',
      name: 'tests-first',
      description: 'Write the section test instructions as failing tests before implementing.',
      body: `## Rule

Each section ships \`tests.md\`. Convert it to real tests, watch them fail, then implement.

- Every screen: renders with sample data, empty state, keyboard path.
- Every flow: one end-to-end test.
- Assert what the user sees, not internals.

## Why

Tests written after the fact describe what was built. Written first they describe what was asked for.`,
    },
    {
      domain: 'quality',
      name: 'states-and-empty',
      description: 'Empty, loading and error states are part of done.',
      body: `## Rule

Every list, table and form needs: loading skeleton, empty state with a next step, error state with a retry.

## Why

Half of a real product's surface is the data that is not there yet.`,
    },
    {
      domain: 'accessibility',
      name: 'a11y-baseline',
      description: 'Labels, focus, contrast and keyboard paths are not optional.',
      body: `## Rule

- Labels on every control; \`aria-label\` on icon-only buttons.
- Visible focus ring on everything focusable.
- Text contrast ≥ 4.5:1; tokens carry \`onWhite\`/\`onInk\` ratios from the compiler.
- Colour is never the only signal for status — badges carry text.
- Tab order matches visual order.

## Why

The token set was compiled with contrast ratios, so a failing component is a component that ignored its tokens.`,
    },
  ]
}

function indexYml(list: Standard[]): string {
  const byDomain = new Map<string, Standard[]>()
  for (const standard of list) {
    byDomain.set(standard.domain, [...(byDomain.get(standard.domain) ?? []), standard])
  }
  const lines = [
    '# Agent OS standards index.',
    '# Generated by Lula DevZign from the compiled design system and code exports.',
    '# An agent reads the description to decide what to inject; the file holds the full rule.',
    '#',
    '# Run /discover-standards in Agent OS, or regenerate this project, to refresh.',
    '',
  ]
  for (const [domain, items] of byDomain) {
    lines.push(`${domain}:`)
    for (const item of items) {
      lines.push(`  - name: ${item.name}`, `    file: ${domain}/${item.name}.md`, `    description: ${item.description}`)
    }
  }
  return lines.join('\n') + '\n'
}

function productDocs(project: Project): PackageFile[] {
  const design = project.design
  return [
    {
      path: 'agent-os/product/mission.md',
      content: `# Mission

**${project.name}** — ${project.brief.tagline}

## The problem

${project.brief.problems.map((p) => `### ${p.title}\n\n${p.detail}\n\nCost of inaction: ${p.cost}`).join('\n\n')}

## Who it is for

${project.brief.personas.map((p) => `- **${p.name}** — ${p.role}, ${p.segment}. Goal: ${p.goal}. Pain: ${p.pain}.`).join('\n')}

## Why us

${project.brief.differentiators.map((d) => `- **${d.title}** — ${d.detail}`).join('\n')}

## What success looks like

${bullets(project.brief.metrics.map((m) => `${m.label}: ${m.target} (${m.why})`))}

## What we will not do

${bullets(project.brief.nonGoals)}
`,
    },
    {
      path: 'agent-os/product/roadmap.md',
      content: `# Roadmap

${project.roadmap.sequencingNote}

${project.roadmap.phases
  .map(
    (phase) => `## ${phase.name} · ${phase.horizon}

${phase.goal}

${bullets(phase.outcomes)}

Sections: ${phase.sectionIds.map((id) => project.sections.find((s) => s.id === id)?.name ?? id).join(', ')}
Risk: ${phase.risk}`,
  )
  .join('\n\n')}
`,
    },
    {
      path: 'agent-os/product/tech-stack.md',
      content: `# Tech stack

| Layer | Decision | Version | Why |
| --- | --- | --- | --- |
${project.system.stack.map((s) => `| ${s.layer} | ${s.choice} | ${s.version} | ${s.reason} |`).join('\n')}

## Frontend

React + TypeScript, Tailwind v4 reading \`design-system/tokens.css\`. Components come from
\`sections/*/components\` and \`shell/components\`; screens compose them.

## Data

\`src/data/types.ts\` holds the domain types, \`src/data/repository.ts\` the interface,
\`src/data/mock-adapter.ts\` the seeded implementation (${project.data.entities.length} entities,
${project.data.relationships.length} relationships). The UI imports the interface only.

## Design system

${design.colors.length} colour families, ${design.typography.length} type roles, ${Object.keys(design.radii).length} radii,
${design.spacing.length} spacing steps, ${design.breakpoints.length} breakpoints. Tokens ship as CSS custom
properties and as W3C DTCG JSON.
`,
    },
  ]
}

function specFiles(project: Project): PackageFile[] {
  const stamp = new Date(project.updatedAt)
  const date = `${stamp.toISOString().slice(0, 10)}-${String(stamp.getUTCHours()).padStart(2, '0')}${String(stamp.getUTCMinutes()).padStart(2, '0')}`
  const list = standards(project)

  return project.sections.flatMap((section) => {
    const folder = `agent-os/specs/${date}-${slug(section.name)}`
    const flows = project.flows.filter((f) => f.steps.some((s) => s.sectionId === section.id))
    const entityNames = section.entityIds.map((id) => project.data.entities.find((e) => e.id === id)?.name ?? id)
    const relevant = list.filter(
      (standard) =>
        standard.domain === 'ui' ||
        (standard.domain === 'data' && entityNames.length > 0) ||
        (section.screens.some((s) => s.blocks.some((b) => b.type === 'form')) && standard.domain === 'accessibility'),
    )

    return [
      {
        path: `${folder}/shape.md`,
        content: `# Shape — ${section.name}

_Created by the Lula DevZign compiler, which answers the shape-spec questions from the compiled product instead of asking them. Edit freely; this file is project history._

## What are we building?

${section.purpose}

Screens:

${bullets(section.screens.map((s) => `**${s.name}** — \`${s.route}\` (${s.kind}). ${s.intent}`))}

## Scope

In:

${bullets(section.requirements.filter((r) => r.priority !== 'could').map((r) => `${r.text} _(${r.priority})_`))}

Out:

${bullets(section.outOfScope)}

## Do we have visuals?

Yes. \`visuals/\` holds the rendered screenshot of each screen at 1280×800, drawn from the same compiled tokens as the live prototype. The interactive prototype is the higher-fidelity reference: open the Prototype track and walk the flow.

## Similar code to reference?

- Shell: \`shell/components/AppShell.tsx\`
- Sibling section: ${(() => {
          const other = project.sections.find((s) => s.id !== section.id && s.screens.length > 0)
          return other ? `\`sections/${other.id}/components/\` (same pattern, different entities)` : 'none yet'
        })()}
- Data contracts: \`data-shapes/overview.ts\`

## Product alignment

Mission: ${project.brief.metrics[0]?.label ?? 'see mission.md'} measured at ${project.brief.metrics[0]?.target ?? 'target'}.
This section serves ${section.priority} scope on the roadmap.

## Which standards apply?

${bullets(relevant.map((s) => `\`${s.domain}/${s.name}\` — ${s.description}`))}

## Done when

${bullets(section.tests)}
`,
      },
      {
        path: `${folder}/plan.md`,
        content: `# Plan — ${section.name}

Ordered tasks. Task 1 saves this documentation, exactly like Agent OS's shape-spec.

1. **Save spec documentation** — this folder (\`plan.md\`, \`shape.md\`, \`references.md\`, \`standards.md\`, \`visuals/\`).
2. **Types** — copy \`sections/${section.id}/types.ts\` into the app's type module.
3. **Data** — implement the repository calls for ${entityNames.join(', ') || 'this section'} against the mock adapter first.
4. **Components** — drop in ${section.screens.length} component(s) from \`sections/${section.id}/components/\`; do not restyle them.
5. **Routes** — mount ${section.screens.map((s) => `\`${s.route}\``).join(', ')} inside \`AppShell\`.
6. **States** — empty, loading and error for every data surface.
7. **Tests** — implement \`sections/${section.id}/tests.md\`; all green before review.
8. **Review** — the standards in \`standards.md\` are the review checklist.

## Risks

${bullets(section.screens.flatMap((s) => s.states.map((state) => `${s.name}: ${state.name} — ${state.detail}`)).slice(0, 6))}
`,
      },
      {
        path: `${folder}/references.md`,
        content: `# References — ${section.name}

## In this package

${bullets([
  `\`sections/${section.id}/components/\` — the components to mount`,
  `\`sections/${section.id}/tests.md\` — the tests to write first`,
  `\`sections/${section.id}/sample-data.json\` — rows for the first pass`,
  `\`data-shapes/overview.ts\` — the prop contracts`,
  `\`shell/components/AppShell.tsx\` — the frame these screens render inside`,
  `\`instructions/incremental/${String(project.sections.findIndex((s) => s.id === section.id) + 2).padStart(2, '0')}-${section.id}.md\` — the milestone these tasks belong to`,
])}

## Flows to keep working

${flows.length ? flows.map((f) => `- **${f.name}** (${f.persona}) — ${f.steps.map((s) => s.title).join(' → ')}. Success: ${f.success}`).join('\n') : '- No flow crosses this section yet.'}

## Similar patterns in the wider codebase

Look for the closest existing feature that already uses \`${project.system.components[0]?.name ?? 'registry component'}\` and copy its composition, not its styling.
`,
      },
      {
        path: `${folder}/standards.md`,
        content: `# Standards that apply — ${section.name}

Injected in full so implementation can start from this file alone.

${relevant.map((standard) => `## ${standard.domain}/${standard.name}\n\n${standard.body}`).join('\n\n')}
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

Screenshots are drawn from the compiled screen blocks and the design tokens, so they are never out of date with the prototype.
`,
      },
    ]
  })
}

function skills(project: Project): PackageFile[] {
  const design = project.design
  return [
    {
      path: 'agent-os/skills/frontend-design/SKILL.md',
      content: `---
name: frontend-design
description: Compose ${project.name} screens from the generated design system and registry. Use when building or reviewing any UI.
---

# Frontend design skill

## Tokens

- Colours: \`var(--primary)\`, \`var(--accent)\`, \`var(--ink)\`, \`var(--ink-muted)\`, \`var(--surface)\`, \`var(--surface-2)\`, \`var(--border)\`, \`var(--border-strong)\`
- Type: \`--font-display\`, \`--font-body\`, \`--font-mono\` (${design.typography.map((t) => t.family).join(', ')})
- Radius: ${Object.entries(design.radii).map(([k, v]) => `\`--radius-${k}\` ${v}px`).join(', ')}
- Space: ${design.spacing.map((s) => `\`--space-${s.name}\` ${s.px}px`).join(', ')}
- Breakpoints: ${design.breakpoints.map((b) => `\`${b.name}\` ${b.px}px`).join(', ')}

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

  files.push({
    path: 'agent-os/README.md',
    content: `# Agent OS

The standards and spec-driven workflow layer, generated from this product so the exported code can be reviewed and extended by an agent without re-teaching it context.

\`\`\`
agent-os/
├── product/{mission,roadmap,tech-stack}.md     # /plan-product output
├── standards/index.yml + <domain>/*.md         # /discover-standards output
├── specs/<date>-<section>/{shape,plan,references,standards}.md + visuals/
└── skills/frontend-design/SKILL.md
\`\`\`

## The loop

1. **Discover** — \`standards/index.yml\` lists what the code must do, with a one-line description per rule for cheap matching.
2. **Inject** — read the relevant domain files (or \`specs/*/standards.md\`, which inlines them).
3. **Build** — follow \`instructions/\` milestones and the per-section plans.
4. **Refine** — edit the standard, then re-run the audit.

## Commands this replaces

| Agent OS command | Here |
| --- | --- |
| \`/plan-product\` | \`agent-os/product/*\` is written by the compiler from the brief, roadmap and stack |
| \`/discover-standards\` | \`agent-os/standards/*\` is derived from the design system and data exports |
| \`/index-standards\` | \`standards/index.yml\` is generated with descriptions |
| \`/inject-standards\` | \`specs/*/standards.md\` inlines the applicable rules |
| \`/shape-spec\` | \`specs/*/shape.md\` answers the shaping questions from the compiled product |
`,
  })

  files.push(...productDocs(project))
  for (const standard of list) {
    files.push({ path: `agent-os/standards/${standard.domain}/${standard.name}.md`, content: `# ${standard.name}\n\n${standard.description}\n\n${standard.body}\n` })
  }
  files.push({ path: 'agent-os/standards/index.yml', content: indexYml(list) })
  files.push(...specFiles(project))
  files.push(...skills(project))

  return files
}
