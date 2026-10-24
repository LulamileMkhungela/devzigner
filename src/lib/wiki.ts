import type { Project, Version } from '../types'

export interface WikiEntry {
  slug: string
  title: string
  summary: string
  body: string
  icon: string
}

/**
 * The prototype wiki: the product and design knowledge that an agent (or a
 * teammate) needs, written from the compiled artefacts rather than by hand.
 * Every entry is also written into the export package under wiki/.
 */

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

export function buildWiki(project: Project): WikiEntry[] {
  const design = project.design
  const primary = design.colors.find((c) => c.role === 'primary') ?? design.colors[0]
  const screens = project.sections.flatMap((s) => s.screens)

  return [
    {
      slug: 'product',
      title: 'Product',
      icon: 'FileText',
      summary: `${project.name} — ${project.brief.category}`,
      body: `# ${project.name}\n\n${project.brief.tagline}\n\n${project.brief.summary}\n\n**Value proposition.** ${project.brief.elevator}\n\n## The problem\n\n${project.brief.problems
        .map((p) => `### ${p.title}\n\n${p.detail}\n\nCost of leaving it: ${p.cost}`)
        .join('\n\n')}\n\n## Who it is for\n\n${project.brief.personas
        .map((p) => `**${p.name}** — ${p.role}, ${p.segment}\n\n- Goal: ${p.goal}\n- Pain: ${p.pain}\n- “${p.quote}”`)
        .join('\n\n')}\n\n## Success measures\n\n${bullets(project.brief.metrics.map((m) => `${m.label}: ${m.target} — ${m.why}`))}\n\n## Principles\n\n${bullets(project.brief.principles)}\n\n## Not in scope\n\n${bullets(project.brief.nonGoals)}`,
    },
    {
      slug: 'flows',
      title: 'UX flows',
      icon: 'Route',
      summary: `${project.flows.length} flows · ${project.flows.reduce((n, f) => n + f.steps.length, 0)} steps`,
      body: `# UX flows\n\n${project.flows
        .map(
          (flow) =>
            `## ${flow.name}\n\n- Persona: ${flow.persona}\n- Goal: ${flow.goal}\n- Trigger: ${flow.trigger}\n\n${flow.steps
              .map((s, i) => `${i + 1}. **${s.title}** (${s.kind}) — ${s.detail}${s.screenId ? ` → \`${flowScreenRoute(project, s.screenId)}\`` : ''}`)
              .join('\n')}\n\nSuccess: ${flow.success}\n\nFailure: ${flow.failure}`,
        )
        .join('\n\n')}`,
    },
    {
      slug: 'data-layer',
      title: 'Data layer',
      icon: 'Database',
      summary: `${project.data.entities.length} entities · mock adapter separated from UI`,
      body: `# Data layer\n\n${project.system.dataLayer.pattern}\n\n## Separation rules\n\n${bullets(project.system.dataLayer.separation)}\n\n## Interfaces\n\n${project.system.dataLayer.interfaces
        .map((i) => `### ${i.entity}\n\n\`\`\`ts\ninterface ${i.entity}Repository {\n${i.methods.map((m) => `  ${m}`).join('\n')}\n}\n\`\`\``)
        .join('\n\n')}\n\n## Entities\n\n${project.data.entities
        .map((e) => `### ${e.name}\n\n${e.description}\n\n${bullets(e.fields.map((f) => `\`${f.name}\` — ${f.type}${f.required ? '' : ' (optional)'}`))}`)
        .join('\n\n')}\n\nDummy rows: ${project.data.entities.reduce((n, e) => n + e.rows.length, 0)} seeded records.`,
    },
    {
      slug: 'design-system',
      title: 'Design system',
      icon: 'Palette',
      summary: `${design.name} · ${primary.base}`,
      body: `# ${design.name}\n\n${design.rationale}\n\n## Colour\n\n${design.colors
        .map((c) => `- **${c.role}** \`${c.base}\` (on: ${c.contrastText}) — ${c.rationale}`)
        .join('\n')}\n\n## Type\n\n${design.typography
        .map((t) => `- **${t.role}** ${t.family} · ${t.size} / ${t.lineHeight} · ${t.tracking}`)
        .join('\n')}\n\n## Radius & space\n\n${bullets(Object.entries(design.radii).map(([k, v]) => `${k}: ${v}px`))}\n\n## Shell\n\n- Frame: ${design.layout.shell}\n- Content: ${design.layout.contentWidth}px\n- Density: ${design.layout.density}\n- Cards: ${design.layout.cardStyle}\n\n## Tokens\n\n\`\`\`css\n${design.tokensCss}\n\`\`\``,
    },
    {
      slug: 'components',
      title: 'Component registry',
      icon: 'Layers',
      summary: `${project.system.components.length} components · tokens only`,
      body: `# Component registry\n\nThe prototype is built only from these components. Each entry names the tokens it may use.\n\n${project.system.components
        .map(
          (c) =>
            `## ${c.name} · ${c.group}\n\n- Variants: ${c.variants.join(', ')}\n- Tokens: ${c.tokens.map((t) => `\`${t}\``).join(', ')}\n- Used by: ${c.usedBy.join(', ')}\n- Props: ${c.props.map((p) => `${p.name}: ${p.type}`).join('; ')}`,
        )
        .join('\n\n')}`,
    },
    {
      slug: 'app-shell',
      title: 'App shell',
      icon: 'Layout',
      summary: project.system.shell.frame,
      body: `# App shell\n\n${project.system.shell.frame}\n\n## Regions\n\n${project.system.shell.regions
        .map((r) => `### ${r.region}\n\n${r.description}\n\nComponents: ${r.components.join(', ')}`)
        .join('\n\n')}\n\n## Navigation\n\n${bullets(project.system.shell.nav.map((n) => n.label))}\n\n## Routes\n\n${bullets(
        project.system.shell.routes.map((r) => `\`${r.path}\` — ${r.name}`),
      )}`,
    },
    {
      slug: 'screens',
      title: 'Screens',
      icon: 'LayoutDashboard',
      summary: `${screens.length} screens across ${project.sections.length} sections`,
      body: `# Screens\n\n${project.sections
        .map(
          (section) =>
            `## ${section.name} (${section.priority})\n\n${section.purpose}\n\n${section.screens
              .map((s) => `- **${s.name}** \`${s.route}\` — ${s.intent}`)
              .join('\n')}`,
        )
        .join('\n\n')}`,
    },
    {
      slug: 'stack',
      title: 'Tech stack',
      icon: 'Cog',
      summary: `${project.system.stack.length} decisions`,
      body: `# Tech stack\n\n| Layer | Choice | Version | Why |\n| --- | --- | --- | --- |\n${project.system.stack
        .map((s) => `| ${s.layer} | ${s.choice} | ${s.version} | ${s.reason} |`)
        .join('\n')}`,
    },
    {
      slug: 'audit',
      title: 'Audit',
      icon: 'ShieldCheck',
      summary: `${project.audit.score}/100 · ${project.audit.checks.length} checks`,
      body: `# Audit\n\n${project.audit.summary}\n\n${project.audit.checks
        .map((c) => `- **${c.status.toUpperCase()}** ${c.group} · ${c.label} — ${c.detail}`)
        .join('\n')}`,
    },
  ]
}

export function flowScreenRoute(project: Project, screenId: string): string {
  for (const section of project.sections) {
    const screen = section.screens.find((s) => s.id === screenId)
    if (screen) return screen.route
  }
  return ''
}

export function versionsMarkdown(project: Project, versions: Version[]): string {
  const lines = [`# ${project.name} — version log`, '', `${versions.length} snapshots. Branches are listed with their head commit first.`, '']
  const byBranch = new Map<string, Version[]>()
  for (const v of versions) {
    const list = byBranch.get(v.branch) ?? []
    list.push(v)
    byBranch.set(v.branch, list)
  }
  for (const [branch, list] of byBranch) {
    lines.push(`## ${branch}`)
    for (const v of list) {
      lines.push(
        `- \`${v.id}\` ${new Date(v.at).toISOString().slice(0, 16).replace('T', ' ')} — ${v.message}` +
          ` · ${v.stats.sections} sections, ${v.stats.screens} screens, ${v.stats.flows} flows, audit ${v.stats.score}, primary ${v.stats.primary}`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}
