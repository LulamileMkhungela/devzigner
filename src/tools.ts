/**
 * The eight free tools for builders, in the order the toolkit
 * presents them, with the steps each one actually runs.
 *
 * The skill steps are parsed from the vendored SKILL.md headings, so the app
 * cannot drift from the text being shipped. The fifteen commands are
 * based; their steps are the command sequences the site documents.
 */
import { TOOLKIT } from './export/vendor/toolkit'

export type ToolKind = 'Agent skill' | 'Template' | 'Convention' | 'Workflow'

export interface Tool {
  id: string
  name: string
  kind: ToolKind
  blurb: string
  /** Where the real files live in the export. */
  ships: string
  /** No external site: every tool here is installed in the package. */
  url?: string
  steps: string[]
  /**
   * The upstream file behind each step, when there is one. Same length as
   * `steps` or empty — a step without its own file (a command in a workflow)
   * gets no path rather than an invented one.
   */
  stepFiles?: string[]
}

function headings(content: string, pattern: RegExp): string[] {
  const out: string[] = []
  for (const line of content.split('\n')) {
    const match = line.match(pattern)
    if (match) out.push(match[1].replace(/\s+/g, ' ').trim())
  }
  return out
}

function vendored(id: string) {
  return TOOLKIT.find((tool) => tool.id === id)
}

/**
 * A skill's phases, read from the instruction that defines them.
 *
 * Some skills enumerate their phases in SKILL.md and keep each one in its own
 * `steps/` file (`1. **Brain dump intake** — `steps/brain-dump.md``); others use
 * `## Phase 1 — …` headings in SKILL.md and no step files at all. Both layouts
 * are read here, in the order the skill itself states, so the count on this page
 * is the count the agent will actually run. A deliberately loose fallback would
 * silently show four steps for an eleven-step process.
 */
function skillPhases(id: string): { steps: string[]; stepFiles?: string[] } {
  const tool = vendored(id)
  const skill = tool?.files.find((file) => file.path.endsWith('/SKILL.md'))
  if (!skill) return { steps: [] }

  // Layout A: a numbered list whose items point at their own step file. The
  // path must follow the bold title on the same line, which is what separates a
  // phase list from a bulleted list of rules that happens to reference a file.
  const numbered: { title: string; file: string }[] = []
  for (const line of skill.content.split('\n')) {
    const match = line.match(/^\s*\d+\.\s+\*\*(.+?)\*\*[^`]*`(steps\/[\w.-]+\.md)`/)
    if (match) numbered.push({ title: match[1].replace(/\s+/g, ' ').trim(), file: match[2] })
  }
  if (numbered.length >= 3) {
    return { steps: numbered.map((n) => n.title), stepFiles: numbered.map((n) => n.file) }
  }

  // Layout B: `## Phase N — Title` / `## Step N — Title` headings, then any
  // `##` heading as a last resort (section headings such as "Hard rules" are
  // filtered out, because they are not things the skill does in order).
  const BOILERPLATE = /^(audience assumption|core interaction principles|hard (rules|assumptions)|final note.*|prerequisites|the process|canonical section list|token derivation.*|style notes.*)$/i
  const phased = headings(skill.content, /^##\s+(?:Phase|Step)\s+[\w.]+(?:\s*[—–-]\s*)?(.*)$/)
  if (phased.length) return { steps: phased }
  const anyH2 = headings(skill.content, /^##\s+(.*)$/).filter((title) => !BOILERPLATE.test(title))
  return { steps: anyH2 }
}

export const TOOLS: Tool[] = [
  {
    id: 'prd-creator',
    name: 'PRD Creator',
    kind: 'Agent skill',
    blurb: 'Turns a fuzzy idea into a locked PRD plus build-ready milestone prompts and a milestone log.',
    ships: '.agents/skills/prd-creator/ + _build_plan/prd.md and one prompt per milestone',
    ...skillPhases('prd-creator'),
  },
  {
    id: 'skill-builder',
    name: 'Skill Builder',
    kind: 'Agent skill',
    blurb: 'Interviews you about a repeatable process, then designs, writes and verifies a portable skill.',
    ships: '.agents/skills/skill-builder/',
    ...skillPhases('skill-builder'),
  },
  {
    id: 'design-system',
    name: 'Design System',
    kind: 'Agent skill',
    blurb: 'Scaffolds a real design system into a React + Tailwind app, with a preview page and agent rules.',
    ships: '.agents/skills/design-system/ (50 reference files)',
    ...skillPhases('design-system'),
  },
  {
    id: 'starter',
    name: 'Starter',
    kind: 'Template',
    blurb: 'The Rails + React starter: conventions, agent instructions and deployment notes, already canonical.',
    ships: 'template/starter/',
    steps: [
      'Clone the template and bundle install',
      'Set the app name and credentials',
      'Create the database and run the seed',
      'Start the dev processes and open the app',
      'Read AGENTS.md before the first agent session',
      'Deploy with the Hatchbox guide',
    ],
  },
  {
    id: 'agents',
    name: 'Agents canon',
    kind: 'Convention',
    blurb: 'One canonical home for skills and instructions: .agents/skills + AGENTS.md, with symlinks for the holdouts.',
    ships: '.agents/ + AGENTS.md + scripts/link-agents.sh',
    steps: [
      'Install every skill into .agents/skills/',
      'Write agent instructions to AGENTS.md',
      'Point CLAUDE.md at AGENTS.md',
      'Symlink .claude/skills to ../.agents/skills',
      'Never store a real skill inside a tool-specific path',
      'Bake the setup into the template repo',
    ],
  },
  {
    id: 'favicon-creator',
    name: 'Favicon Creator',
    kind: 'Agent skill',
    blurb: 'Generates the full favicon set from one icon and wires the meta tags into the codebase.',
    ships: '.agents/skills/favicon-creator/ + favicon.svg (the set is built by the skill)',
    ...skillPhases('favicon-creator'),
  },
  {
    id: 'standards',
    name: 'Standards',
    kind: 'Workflow',
    blurb: 'Standards, specs and shaping for the coding agent, captured once and injected everywhere.',
    ships: 'standards/ + .agents/commands/prodops/ (the five standards commands)',
    steps: ['Install', 'Discover', 'Inject', 'Shape'],
  },
  {
    id: 'prodops',
    name: 'ProdOps flow',
    kind: 'Workflow',
    blurb: 'Plan and design a real app in five stages, then export a handoff a coding agent can build from.',
    ships: 'product-plan/ + .agents/commands/prodops/ (the ten stage commands)',
    steps: ['Product', 'Data Shape', 'Design', 'Sections', 'Export'],
  },
]

export function toolById(id: string): Tool | undefined {
  return TOOLS.find((tool) => tool.id === id)
}

export function vendoredFileCount(id: string): number {
  return vendored(id)?.files.length ?? 0
}
