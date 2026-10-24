import type { Project } from '../types'
import type { PackageFile } from './package'

/**
 * The Design OS command surface, plus the planning folder its
 * /product-vision, /product-roadmap, /data-shape, /design-tokens,
 * /design-shell and /shape-section commands write.
 *
 * The app performs the same steps in its five phases; a team that wants the
 * slash-command workflow in Claude Code (or any agent that reads files) can
 * drop these in `.claude/commands/` and keep working the way Design OS does.
 */

function bullet(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

function command(name: string, description: string, body: string): PackageFile {
  return {
    path: `commands/${name}.md`,
    content: `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`,
  }
}

export function buildCommands(project: Project): PackageFile[] {
  const first = project.sections[0]
  return [
    command(
      'product-vision',
      'Restate the product vision from the compiled brief and confirm or edit it',
      `# /product-vision

Read \`product/product-overview.md\` and \`product-brief.md\`.

1. Summarise the problem, who it is for, the value proposition and the non-goals in five bullets.
2. Ask exactly one question per bullet where the compiled brief is thin.
3. Write the accepted answers back to \`product/product-overview.md\`.

Do not invent research. Personas in this package are labelled illustrative.`,
    ),
    command(
      'product-roadmap',
      'Review and adjust the phased roadmap',
      `# /product-roadmap

Read \`product/product-roadmap.md\` and \`roadmap.md\`.

1. Walk the phases in order: ${project.roadmap.phases.map((p) => `${p.name} (${p.horizon})`).join(' → ')}.
2. For each phase, confirm the outcomes are observable and the mapped sections are right.
3. Write the result to \`product/product-roadmap.md\`.

Keep the sequencing note at the top; it explains why this order and not another.`,
    ),
    command(
      'data-shape',
      'Confirm the entities, fields and relationships',
      `# /data-shape

Read \`product/data-shape/data-shape.md\`, \`data-model.md\` and \`schema.sql\`.

1. Check every entity has a primary field (${project.data.entities.map((e) => e.primaryField).slice(0, 3).join(', ')}…), a status field where it has a lifecycle, and a foreign key for every relation.
2. Flag fields that are computed rather than stored.
3. Write the agreed shape to \`product/data-shape/data-shape.md\`. Do not renumber ids: they are referenced by sections and screens.`,
    ),
    command(
      'design-tokens',
      'Stop before building: agree the tokens',
      `# /design-tokens

Read \`design-system/tokens.css\`, \`design-system/tokens.dtcg.json\` and \`product/design-system/colors.json\`.

1. Present the palette (${project.design.colors.length} families × 11 stops), the three type roles and the spacing scale.
2. Ask which values you want changed — hue, radius, density — not which hex.
3. Apply the change in the token file only, then re-export. No component may be edited to change the look.`,
    ),
    command(
      'design-shell',
      'Review the application shell before section work',
      `# /design-shell

Read \`product/shell/spec.md\`, \`shell/README.md\`, \`shell/components/AppShell.tsx\` and \`shell/screenshot.svg\`.

1. Confirm the frame (${project.design.layout.shell}), navigation labels (${project.system.shell.nav.map((n) => n.label).join(', ')}) and content width (${project.design.layout.contentWidth}px).
2. Confirm the shell is layout-only: no data fetching, no auth.
3. Write any change to \`product/shell/spec.md\` and the component together.`,
    ),
    command(
      'shape-section',
      'Shape one section into a spec an agent can execute',
      `# /shape-section <section>

1. Read \`sections/<section>/README.md\` and \`agent-os/specs/<date>-<section>/shape.md\`.
2. Answer the shaping questions from the compiled product: what, visuals, references, product alignment, standards.
3. Confirm the out-of-scope list before adding scope.
4. Update \`agent-os/specs/<date>-<section>/shape.md\`.

Start with \`${first?.id ?? 'the first section'}\`.`,
    ),
    command(
      'sample-data',
      'Refresh the rows the UI runs on',
      `# /sample-data <section>

1. Read \`sections/<section>/sample-data.json\`.
2. Check every screen has enough rows to show a real state — not just the happy path — and at least one row that triggers the empty state when filtered.
3. Keep values plausible for the domain; no lorem ipsum.
4. Write back to the same file and to \`src/data/mock-adapter.ts\`.`,
    ),
    command(
      'design-screen',
      'Design one screen from registry components only',
      `# /design-screen <section>/<screen>

1. Read the screen spec in \`screens.md\` and the component in \`sections/<section>/components/\`.
2. Compose it only from \`system/registry\`; if a pattern is missing, add it to the registry first.
3. Every input is a real input. Every empty state explains the next step.
4. Verify at ${project.design.breakpoints.map((b) => `${b.px}px`).join(', ')}.`,
    ),
    command(
      'screenshot-design',
      'Capture and check the visual',
      `# /screenshot-design <section>

1. Open the prototype at the screen's route and capture it at 1280×800.
2. Compare with \`sections/<section>/screenshot.svg\` — the shipped image is rendered from the compiled blocks, so a difference means the component drifted from the spec.
3. Replace the screenshot only when the spec changed.`,
    ),
    command(
      'export-product',
      'Assemble the handoff package',
      `# /export-product

1. Run the audit in the app; every check must be \`pass\` or explained.
2. Download the package. It includes specs, schema, tokens, prompts, milestones, components, tests and the standards layer.
3. Commit it beside the code on a branch, and open the first milestone as a PR.

Never hand-edit generated files. Change the source (tokens, registry, sections) and re-export.`,
    ),
    command(
      'plan-product',
      'Agent OS planning pass over mission, roadmap and stack',
      `# /plan-product

1. Read \`agent-os/product/{mission,roadmap,tech-stack}.md\`.
2. Ask only what the compiled product cannot answer: stakeholders, constraints, compliance.
3. Update those three files together; \`/shape-spec\` reads them for context.`,
    ),
    command(
      'shape-spec',
      'Shape a spec that persists beyond the conversation',
      `# /shape-spec <feature>

1. Read \`agent-os/product/\` and \`agent-os/standards/index.yml\`.
2. Ask: what are we building, do we have visuals, similar code, product alignment, which standards apply.
3. Write \`agent-os/specs/<YYYY-MM-DD-HHMM>-<slug>/{plan,shape,references,standards}.md\` + \`visuals/\`.
4. Task 1 of the plan saves this documentation.`,
    ),
    command(
      'inject-standards',
      'Load the standards that apply to the current work',
      `# /inject-standards

1. Read \`agent-os/standards/index.yml\`.
2. Choose the rules that apply to the files you are about to touch.
3. Read them in full from \`agent-os/standards/<domain>/<name>.md\`.
4. State which rules you are following before writing code.`,
    ),
    command(
      'discover-standards',
      'Capture a new tribal rule from the code',
      `# /discover-standards <area>

1. Read 5–10 representative files in the area.
2. Look for choices that could have gone differently: naming, error handling, composition, data access.
3. Write one file per rule under \`agent-os/standards/<domain>/\`: rule first, why second, an example.
4. Add it to \`index.yml\` with a one-line description.`,
    ),
  ]
}

export function buildPlanning(project: Project): PackageFile[] {
  const design = project.design
  const primary = design.colors.find((c) => c.role === 'primary') ?? design.colors[0]
  return [
    {
      path: 'product/product-overview.md',
      content: `# ${project.name}

${project.brief.tagline}

## Vision

${project.brief.elevator}

## Target users

${project.brief.personas.map((p) => `- **${p.name}** — ${p.role}, ${p.segment}`).join('\n')}

## Problems solved

${project.brief.problems.map((p) => `- **${p.title}** — ${p.detail}`).join('\n')}

## Core capabilities

${bullet(project.sections.map((s) => `${s.name}: ${s.purpose}`))}

## Non-goals

${bullet(project.brief.nonGoals)}
`,
    },
    {
      path: 'product/product-roadmap.md',
      content: `# ${project.name} — roadmap

${project.roadmap.sequencingNote}

${project.roadmap.phases
  .map(
    (phase) => `## ${phase.name} — ${phase.horizon}

${phase.goal}

Outcomes:

${bullet(phase.outcomes)}

Sections: ${phase.sectionIds.map((id) => project.sections.find((s) => s.id === id)?.name ?? id).join(', ')}`,
  )
  .join('\n\n')}
`,
    },
    {
      path: 'product/data-shape/data-shape.md',
      content: `# Data shape

${project.data.notes.map((n) => `- ${n}`).join('\n')}

## Entities

${project.data.entities
  .map(
    (entity) => `### ${entity.name}

${entity.description}

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
${entity.fields.map((field) => `| \`${field.name}\` | ${field.type}${field.options?.length ? ` (${field.options.join(' / ')})` : ''} | ${field.required ? 'yes' : 'no'} | ${field.note} |`).join('\n')}`,
  )
  .join('\n\n')}

## Relationships

${project.data.relationships.map((r) => `- \`${r.from}\` → \`${r.to}\` (${r.kind})${r.via ? ` via \`${r.via}\`` : ''} — ${r.label}`).join('\n')}
`,
    },
    {
      path: 'product/design-system/colors.json',
      content: JSON.stringify(
        {
          $comment: 'Tailwind-compatible palette. The typed token file is design-system/tokens.dtcg.json.',
          primary: Object.fromEntries((primary?.stops ?? []).map((stop) => [String(stop.step), stop.hex])),
          families: Object.fromEntries(
            design.colors.map((colour) => [colour.id, Object.fromEntries(colour.stops.map((stop) => [String(stop.step), stop.hex]))]),
          ),
          semantic: design.semantic,
        },
        null,
        2,
      ),
    },
    {
      path: 'product/design-system/typography.json',
      content: JSON.stringify(
        {
          families: design.typography.map((type) => ({
            role: type.role,
            family: type.family,
            stack: type.stack,
            weights: type.weights,
            size: type.size,
            lineHeight: type.lineHeight,
            tracking: type.tracking,
            usage: type.usage,
          })),
          scale: design.scale,
        },
        null,
        2,
      ),
    },
    {
      path: 'product/shell/spec.md',
      content: `# Shell spec

**Frame.** ${design.layout.shell}

${project.system.shell.frame}

## Regions

${project.system.shell.regions.map((r) => `### ${r.region}\n\n${r.description}\n\nComponents: ${r.components.join(', ')}`).join('\n\n')}

## Navigation

${bullet(project.system.shell.nav.map((n) => n.label))}

## Layout

- Content width: ${design.layout.contentWidth}px
- Density: ${design.layout.density}
- Cards: ${design.layout.cardStyle}
- Grid: ${design.layout.grid}
- Breakpoints: ${design.breakpoints.map((b) => `${b.name} ${b.px}px`).join(' · ')}

## Rules

- The shell owns layout only: no data fetching, no auth, no business logic.
- Navigation labels match routes exactly; the active item is marked with \`aria-current="page"\`.
- Below 768px the sidebar becomes a drawer.
`,
    },
    {
      path: 'product/README.md',
      content: `# Product planning

The Design OS planning outputs, in the order the commands produce them:

1. \`product-overview.md\` — /product-vision
2. \`product-roadmap.md\` — /product-roadmap
3. \`data-shape/data-shape.md\` — /data-shape
4. \`design-system/{colors.json,typography.json}\` — /design-tokens
5. \`shell/spec.md\` — /design-shell

The typed, human-readable versions live at the root: \`product-brief.md\`, \`roadmap.md\`, \`data-model.md\`, \`design-system/\`. The slash commands are in \`commands/\`.
`,
    },
  ]
}
