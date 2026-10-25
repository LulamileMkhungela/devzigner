/**
 * The documentation that travels with the package.
 *
 * A handoff is only usable if the person receiving it can find out what the
 * thing is, how the process that produced it works, and how to run it. These
 * pages are written by ProdOps for this product — they are not a copy of
 * anyone's manual, and they only describe files that are actually in the
 * package. `requirements.md` is the one page to read before running anything.
 */
import type { Project } from '../types'
import type { PackageFile } from './package'
import { TOOLS } from '../tools'
import { LICENSES } from './licenses'
import { PHASE_COMMANDS } from './vendor/phaseCommands'
import { STANDARDS_COMMANDS } from './vendor/standardsCommands'

/**
 * One line per command: what the command actually writes. The command files
 * themselves are the instructions; this table is the index a person reads before
 * deciding which one to run.
 */
const COMMAND_NOTES: Record<string, string> = {
  'product-vision': '`product/product-overview.md` — the problem, the people, the value',
  'product-roadmap': '`product/roadmap.md` — milestones with outcomes, in build order',
  'data-shape': '`product/data-shapes/*.ts` — entities, fields, relationships',
  'design-tokens': '`design-system/tokens.json` + `tokens.css` — the DTCG source and its CSS',
  'design-shell': '`product/shell/spec.md` + `src/shell/components/*` — nav, layout, user menu',
  'shape-section': '`sections/<id>/spec.md` — scope, requirements, acceptance criteria',
  'sample-data': '`sections/<id>/sample-data.json` — rows in the section\'s own shapes',
  'design-screen': '`sections/<id>/components/*.tsx` — one component per screen, props only',
  'screenshot-design': '`sections/<id>/screenshots/*.png` — proof each screen was seen',
  'export-product': '`product-plan/` — the handoff, instructions and prompts',
  'plan-product': '`standards/product/{mission,roadmap,tech-stack}.md`',
  'discover-standards': '`standards/standards/<folder>/<name>.md`',
  'index-standards': '`standards/standards/index.yml` — one line per standard',
  'inject-standards': 'the standards relevant to the current task, read in place',
  'shape-spec': '`standards/specs/<date>-<slug>/{plan,shape,references,standards}.md`',
}

const REQUIRED_STACK = `# Requirements

What this package needs in order to run.

## The UI

| Requirement | Version | Why |
| --- | --- | --- |
| Node.js | 22 or newer | the reference API uses Node's built-in test runner and type stripping |
| React | 18 or newer | every section component is a function component with hooks |
| Tailwind CSS | v4 | the components use utility classes; tokens are CSS custom properties |
| TypeScript | 5.4 or newer | the section contracts are typed |

No backend, no database and no API keys are required to see the UI: the mock
adapter in \`src/data/mock-adapter.ts\` is seeded and synchronous.

## The reference API (optional)

\`server/\` has **no npm dependencies**. It runs on the Node you already installed:

\`\`\`bash
cd server
npm run dev     # http://localhost:4000/api/health
npm test        # domain rules + API behaviour
\`\`\`

If you keep it, point the UI at it by importing \`src/data/http-adapter.ts\`
instead of the mock adapter. If you replace it, keep the routes in \`openapi.json\`
and the rules in \`business-logic.md\`.

## The agent tooling (optional)

The commands and skills in \`.agents/\` are files an agent reads. Nothing in the
app depends on them, and no account or key is involved. Start at
\`docs/guides/commands.md\` for the fifteen commands, and \`TOOLKIT.md\` for the
eight tools they belong to.

## Checks

\`\`\`bash
npm run build              # the UI
cd server && npm test      # the reference API
\`\`\`
`

function profileTechStack(project: Project): string {
  const layer = (name: RegExp, fallback: string) =>
    project.system.stack.find((entry) => name.test(entry.layer))?.choice ?? fallback
  return `# Tech Stack

The stack this project is built on. \`/prodops:plan-product\` reads this standard
when it asks whether a new project uses the same stack, and
\`/prodops:shape-spec\` references it.

## Frontend

${layer(/framework|front/i, 'React 18 + TypeScript')} with Tailwind CSS v4 and the
generated design system (\`design-system/tokens.css\`).

## Backend

${layer(/backend|server/i, 'Node 22 — the dependency-free reference API in server/')}

## Database

${layer(/data|database/i, 'Any. The UI only knows the DataLayer interface; swap the adapter.')}

## Other

${layer(/chart|registry|other/i, 'Component registry generated from the compiled design system.')}

## Testing

- API: Node's built-in runner (\`node --experimental-strip-types --test\`)
- UI: the framework-agnostic specs in \`sections/<id>/tests.md\`
`
}

export function buildDocs(project: Project): PackageFile[] {
  const files: PackageFile[] = []
  files.push({ path: 'docs/LICENSES.md', content: LICENSES })
  files.push({ path: 'requirements.md', content: REQUIRED_STACK })
  files.push({ path: 'standards/profiles/default/global/tech-stack.md', content: profileTechStack(project) })

  /* ---- the index ------------------------------------------------------- */
  files.push({
    path: 'docs/README.md',
    content: `# Documentation that travels with the package

Every page here describes a file that is in this package. Nothing is a copy of
someone else's manual, and nothing asks you to visit a website to understand it.

| Page | What it answers |
| --- | --- |
| \`../requirements.md\` | What has to be installed before anything runs |
| \`guides/process.md\` | The five stages, what each one produces, and when it is done |
| \`guides/commands.md\` | The fifteen agent commands, what each writes |
| \`guides/toolkit.md\` | The eight builder tools, their steps and where they live |
| \`guides/standards.md\` | How standards and specs are discovered, indexed and injected |
| \`guides/tokens.md\` | The token contract every component reads |
| \`guides/codebase-implementation.md\` | How to wire the UI to your own backend and tests |
| \`guides/versioning.md\` | Git worktrees, branches and the product wiki |
| \`LICENSES.md\` | The licences of the material that is redistributed here |

## Where to start

- New to the package: \`../requirements.md\`, then \`../README.md\`
- New to the product: \`../product-overview.md\`
- New to the backend: \`../api/README.md\`, then \`../openapi.json\`
- New to the tooling: \`../TOOLKIT.md\`
`,
  })

  /* ---- the process ----------------------------------------------------- */
  files.push({
    path: 'docs/guides/process.md',
    content: `# The process

ProdOps runs one order: **Product → Data Shape → Design → Sections → Export**.
Each stage reads what the stage before it wrote, so the order is not advice.

| # | Stage | You decide | The package gets |
| --- | --- | --- | --- |
| 1 | Product | The problem, the people, the value, the scope, the roadmap | \`product-overview.md\`, \`roadmap.md\`, \`product/\` |
| 2 | Data Shape | Entities, fields, relationships, sample rows | \`data-shapes/\`, \`sections/<id>/sample-data.json\` |
| 3 | Design | Colour, type, spacing, radii, the shell | \`design-system/tokens.json\` (W3C DTCG), \`tokens.css\`, \`src/shell/\` |
| 4 | Sections | One section at a time: spec, data binding, screens, screenshots | \`sections/<id>/\` — \`spec.md\`, components, \`tests.md\`, \`screenshots/\` |
| 5 | Export | How it will be implemented | \`product-plan/\`, \`instructions/\`, \`prompts/\` |

A stage is complete when **you** mark it complete. ProdOps shows what exists and
refuses to tick on your behalf — the tick is a claim about review, not about
compilation.

## What is not in the export

The export is a UI and product handoff, not a full application. Your
implementation agent still builds the real backend and data layer, the routing
and state management, and the test implementations. See
\`codebase-implementation.md\`.
`,
  })

  /* ---- the commands ---------------------------------------------------- */
  const phases = PHASE_COMMANDS.map((c) => `| \`/prodops:${c.name}\` | ${COMMAND_NOTES[c.name] ?? 'Writes its artefacts into the package'} |`).join('\n')
  const standardsCommands = STANDARDS_COMMANDS.map(
    (c) => `| \`/prodops:${c.name}\` | ${COMMAND_NOTES[c.name] ?? 'Maintains the standards layer'} |`,
  ).join('\n')
  files.push({
    path: 'docs/guides/commands.md',
    content: `# The fifteen commands

They are files, not a service: \`.agents/commands/prodops/\` holds one markdown
file per command, named after the command. Any agent that reads markdown
commands can run them; no account, key or daemon is involved.

## The process (ten)

| Command | What it writes |
| --- | --- |
${phases}

## The standards layer (five)

| Command | What it writes |
| --- | --- |
${standardsCommands}

## Running them

\`\`\`bash
ls .agents/commands/prodops/     # the command files
\`\`\`

Point your agent at the package and ask for the command by name. Read
\`guides/standards.md\` before using the standards layer: it explains why
standards are written once and injected rather than repeated per feature.
`,
  })

  /* ---- the toolkit ----------------------------------------------------- */
  const tools = TOOLS.map(
    (tool) =>
      `### ${tool.name}\n\n${tool.blurb}\n\nInstalled at \`${tool.ships}\`.\n\n${tool.steps
        .map((step, i) => `${i + 1}. ${step}${tool.stepFiles?.[i] ? ` — \`${tool.stepFiles[i]}\`` : ''}`)
        .join('\n')}\n`,
  ).join('\n')
  files.push({
    path: 'docs/guides/toolkit.md',
    content: `# The toolkit

Eight tools, installed in this package as skills and commands rather than linked
from a browser tab. Each list below is the tool's own process, in its own order.

${tools}
See \`../TOOLKIT.md\` for the index and \`.agents/skills/\` for the instruction
files themselves.
`,
  })

  /* ---- standards ------------------------------------------------------- */
  files.push({
    path: 'docs/guides/standards.md',
    content: `# Standards and specs

A standard is one rule, written down once, that every feature has to follow.
Writing it three times in three feature briefs is how a codebase ends up with
three answers to the same question.

\`\`\`
standards/
  product/            mission.md, roadmap.md, tech-stack.md
  standards/          <folder>/<name>.md + index.yml
  specs/              <YYYY-MM-DD-HHMM>-<slug>/{plan,shape,references,standards}.md
  profiles/default/   the profile an install reads (tech-stack.md)
\`\`\`

| Command | Effect |
| --- | --- |
| \`/prodops:plan-product\` | mission, roadmap and tech stack — the product's always-read context |
| \`/prodops:discover-standards\` | turns a convention you explain once into a standard file |
| \`/prodops:index-standards\` | rebuilds \`index.yml\`, one line per standard |
| \`/prodops:inject-standards\` | pulls the relevant standards into the current task |
| \`/prodops:shape-spec\` | writes a spec folder before the code is written |

Inject by \`@\` reference, never by copy. A copy is a fork; a reference is the
same sentence read twice.
`,
  })

  /* ---- tokens ---------------------------------------------------------- */
  files.push({
    path: 'docs/guides/tokens.md',
    content: `# The token contract

\`design-system/tokens.json\` is W3C Design Tokens (DTCG) format: \`$value\`,
\`$type\`, \`$description\`, references written as \`{group.token}\`. It is the
source; \`tokens.css\` is generated from it and is the only stylesheet the
components import.

\`\`\`json
{
  "color": {
    "primary": { "$value": "${project.design.colors.find((c) => c.role === 'primary')?.base ?? '#2563eb'}", "$type": "color" }
  },
  "space": {
    "md": { "$value": "${project.design.spacing[2]?.px ?? 12}px", "$type": "dimension" }
  }
}
\`\`\`

Rules the components rely on:

1. No literal colour, radius, font size or spacing value in a component.
2. Dark mode re-points the same token names; it never adds new ones.
3. Contrast is checked at compile time, not in review — \`tokens.json\` carries the
   measured ratio for every text-on-surface pair.
`,
  })

  /* ---- implementation -------------------------------------------------- */
  files.push({
    path: 'docs/guides/codebase-implementation.md',
    content: `# Turning the UI into a working app

The components are props-based and import no data. That is deliberate: it is what
lets them be dropped into your codebase without dragging a mock layer along.

Your implementation agent's job:

1. **Callbacks** — wire \`onView\`, \`onEdit\`, \`onDelete\`, \`onCreate\` to your
   routing and your API.
2. **Data** — replace \`sample-data.json\` with your backend. Keep the shape; the
   components were designed against it.
3. **States** — loading, error and empty states. Each section's \`tests.md\`
   lists the ones that matter.
4. **Tests** — \`tests.md\` describes behaviour, not framework. Write them in
   whatever runner you already have.

## One-shot or incremental

\`product-plan/prompts/one-shot-prompt.md\` builds the whole product in one
session. \`instructions/\` and the per-milestone prompts in
\`product-plan/milestones/\` build it in the order the design was made. Both read
\`product-overview.md\` first.
`,
  })

  /* ---- versioning ------------------------------------------------------ */
  files.push({
    path: 'docs/guides/versioning.md',
    content: `# Git, worktrees and the wiki

The product's knowledge — overview, roadmap, data shape, tokens, section specs,
decisions — lives in files, so git is the version history. ProdOps records a
version each time you commit, and the wiki page is a rendering of those files,
not a second copy of them.

## One branch per exploration

\`\`\`bash
git worktree add ../explore-new-nav -b explore/new-nav
\`\`\`

A worktree gives you a second checkout of the same repository, so an experiment
does not disturb the package you are reviewing. Delete the worktree when the
experiment ends; the branch keeps the decision.

## What to commit

Commit the package, not a build:\`product-plan/\`, \`design-system/\`,
\`sections/\`, \`standards/\`, \`.agents/\`, \`AGENTS.md\`. Do not commit
\`node_modules\` or a compiled bundle.
`,
  })

  return files
}
