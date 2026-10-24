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
        .join('\n')}\n\n## Radius & space\n\n${bullets(Object.entries(design.radii).map(([k, v]) => `${k}: ${v}px`))}\n\n## Shell\n\n- Frame: ${design.layout.shell}\n- Content: ${design.layout.contentWidth}px\n- Density: ${design.layout.density}\n- Cards: ${design.layout.cardStyle}\n\n## Responsive\n\n${bullets(design.breakpoints.map((b) => `\`${b.name}\` — ${b.px}px`))}\n\nThe prototype and every exported component are mobile-first: navigation collapses to a drawer, tables scroll inside their card rather than the page, and no width below 360px breaks the layout. Breakpoints also ship as documentation tokens (\`--breakpoint-*\`) because media queries cannot read custom properties.\n\n## Token format\n\n\`tokens.css\` is for the browser; \`design-system/tokens.dtcg.json\` is the same system in W3C Design Tokens Community Group format, with typed \`$value\`/\`$type\` primitives so Figma, Tokens Studio and Style Dictionary can consume it without a translation layer.\n\n## Tokens\n\n\`\`\`css\n${design.tokensCss}\n\`\`\``,
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
      slug: 'handoff',
      title: 'Agent handoff',
      icon: 'PackageCheck',
      summary: 'Design OS + Agent OS artefacts, and how they are verified',
      body: `# Agent handoff\n\nThe export is not just documentation: it is the file tree a coding agent needs, plus the standards it must keep.\n\n## Design OS parity\n\n- \`prompts/one-shot-prompt.md\` and \`prompts/section-prompt.md\`\n- \`instructions/one-shot-instructions.md\` plus \`instructions/incremental/01-shell.md\` and one file per section\n- \`sections/<id>/components/*.tsx\` — props-based, responsive, never importing sample data\n- \`sections/<id>/tests.md\` — what to assert, written before implementation\n- \`design-system/{tokens.css,tokens.dtcg.json,fonts.md,tailwind-colors.md}\`\n- \`shell/components/{AppShell,MainNav,UserMenu,index}.tsx\` with a rendered shell screenshot\n- \`sections/<id>/screenshot.svg\` — the design, without running the app\n\n## Agent OS parity\n\n- \`agent-os/product/{mission,roadmap,tech-stack}.md\`\n- \`agent-os/standards/index.yml\` and eight rules across ui, data, quality and accessibility\n- \`agent-os/specs/<date>-<section>/{shape,plan,references,standards}.md\` with the screen visuals inline\n- \`agent-os/skills/frontend-design/SKILL.md\`\n\n## How this is proven\n\nOpen **Coverage**: every row rebuilds the package and checks the artefact exists. \`npm run export-check\` writes the generated components to disk and typechecks them, so "production-ready" is a compiler result rather than a claim.\n\n## The reusable loop\n\n1. Read \`product-overview.md\` and the mission.\n2. Inject the standards that apply to the section (\`specs/*/standards.md\` already inlines them).\n3. Follow the milestone, writing tests first.\n4. Wire the components; do not restyle them.\n5. Replace the mock adapter with the real one behind the same interface.`,
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
