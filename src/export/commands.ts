import type { Project } from '../types'
import type { PackageFile } from './package'
import { PHASE_COMMANDS } from './vendor/phaseCommands'

/**
 * The ProdOps command surface, installed exactly as upstream ships it.
 *
 * ProdOps's ten commands live in `.agents/commands/prodops/`; the export
 * writes the same ten files with the same names and the same text, vendored in
 * `vendor/phaseCommands.ts`. They are not adapted to this package: an agent
 * running `/product-vision` gets the real ProdOps conversation, and it reads
 * the artefacts this export already wrote (`product/`, `sections/`).
 *
 * The app's five phases are the no-agent path to the same artefacts; the
 * commands are for teams that want the slash-command workflow in Claude Code.
 * The five Standards commands sit beside them under `.agents/commands/prodops/`
 * (see agentos.ts).
 */
function bullet(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

export function buildCommands(_project: Project): PackageFile[] {
  return PHASE_COMMANDS.map((command) => ({
    path: `.agents/commands/prodops/${command.name}.md`,
    content: command.content,
  }))
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

The ProdOps planning outputs, in the order the commands produce them:

1. \`product-overview.md\` — /product-vision
2. \`product-roadmap.md\` — /product-roadmap
3. \`data-shape/data-shape.md\` — /data-shape
4. \`design-system/{colors.json,typography.json}\` — /design-tokens
5. \`shell/spec.md\` — /design-shell

The typed, human-readable versions live at the root: \`product-brief.md\`, \`roadmap.md\`, \`data-model.md\`, \`design-system/\`. The slash commands are in \`.agents/commands/prodops/\` and \`.agents/commands/prodops/\`.
`,
    },
  ]
}
