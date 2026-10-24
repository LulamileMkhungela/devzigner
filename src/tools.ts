/**
 * The eight free tools for builders from buildermethods.com/tools, in the order
 * the site lists them, with the steps each one actually runs.
 *
 * The skill steps are parsed from the vendored SKILL.md headings, so the app
 * cannot drift from the text being shipped. Design OS and Agent OS are command
 * based; their steps are the command sequences the site documents.
 */
import { TOOLKIT } from './export/vendor/toolkit'

export type ToolKind = 'Agent skill' | 'Template' | 'Convention' | 'Workflow'

export interface Tool {
  id: string
  name: string
  kind: ToolKind
  url: string
  blurb: string
  /** Where the real files live in the export. */
  ships: string
  steps: string[]
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

function skillSteps(id: string, pattern = /^##\s+(?:Phase|Step)\s+[\w.]+(?:\s*[—–-]\s*)?(.*)$/): string[] {
  const tool = vendored(id)
  const skill = tool?.files.find((file) => file.path.endsWith('/SKILL.md'))
  if (!skill) return []
  const steps = headings(skill.content, pattern)
  return steps.length ? steps : headings(skill.content, /^##\s+(.*)$/)
}

export const TOOLS: Tool[] = [
  {
    id: 'prd-creator',
    name: 'PRD Creator',
    kind: 'Agent skill',
    url: 'https://buildermethods.com/prd-creator',
    blurb: 'Turns a fuzzy idea into a locked PRD plus build-ready milestone prompts and a milestone log.',
    ships: '.agents/skills/prd-creator/ + _build_plan/prd.md and one prompt per milestone',
    steps: skillSteps('prd-creator', /^##\s+\d+\\?\.\s*(.*)$/),
  },
  {
    id: 'skill-builder',
    name: 'Skill Builder',
    kind: 'Agent skill',
    url: 'https://buildermethods.com/skill-builder',
    blurb: 'Interviews you about a repeatable process, then designs, writes and verifies a portable skill.',
    ships: '.agents/skills/skill-builder/',
    steps: skillSteps('skill-builder', /^##\s+(.*)$/),
  },
  {
    id: 'design-system',
    name: 'Design System',
    kind: 'Agent skill',
    url: 'https://buildermethods.com/ai-design-system',
    blurb: 'Scaffolds a real design system into a React + Tailwind app, with a preview page and agent rules.',
    ships: '.agents/skills/design-system/ (50 reference files)',
    steps: skillSteps('design-system', /^##\s+Phase\s+[\w.]+\s*[—–-]\s*(.*)$/),
  },
  {
    id: 'build-new',
    name: 'Build New',
    kind: 'Template',
    url: 'https://buildermethods.com/rails-react-template',
    blurb: 'The Rails + React starter: conventions, agent instructions and deployment notes, already canonical.',
    ships: 'template/build-new/',
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
    id: 'agentcanon',
    name: 'agentcanon',
    kind: 'Convention',
    url: 'https://buildermethods.com/agentcanon',
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
    url: 'https://buildermethods.com/favicon-creator',
    blurb: 'Generates the full favicon set from one icon and wires the meta tags into the codebase.',
    ships: '.agents/skills/favicon-creator/ + favicon.svg (the set is built by the skill)',
    steps: skillSteps('favicon-creator', /^##\s+Step\s+\d+\s*[—–-]\s*(.*)$/),
  },
  {
    id: 'agent-os',
    name: 'Agent OS',
    kind: 'Workflow',
    url: 'https://buildermethods.com/agent-os',
    blurb: 'Standards, specs and shaping for the coding agent, captured once and injected everywhere.',
    ships: 'agent-os/ + .claude/commands/agent-os/ (5 commands, verbatim)',
    steps: ['Install', 'Discover', 'Inject', 'Shape'],
  },
  {
    id: 'design-os',
    name: 'Design OS',
    kind: 'Workflow',
    url: 'https://buildermethods.com/design-os',
    blurb: 'Plan and design a real app in four steps, then export a handoff a coding agent can build from.',
    ships: 'product-plan/ + .claude/commands/design-os/ (10 commands, verbatim)',
    steps: ['Product Planning', 'Design System', 'Section Design', 'Export'],
  },
]

export function toolById(id: string): Tool | undefined {
  return TOOLS.find((tool) => tool.id === id)
}

export function vendoredFileCount(id: string): number {
  return vendored(id)?.files.length ?? 0
}
