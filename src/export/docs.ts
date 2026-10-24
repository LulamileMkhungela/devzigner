/**
 * The manuals and the runtime requirements.
 *
 * Design OS and Agent OS are tools with their own documentation and licences.
 * A handoff that ships their artefacts but not their manuals leaves the builder
 * guessing, so the repos' docs travel with the package — verbatim, licences
 * included — under `docs/`. `requirements.md` is the one page a new builder
 * needs before running anything.
 */
import type { Project } from '../types'
import type { PackageFile } from './package'
import { MANUALS } from './vendor/manuals'

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

The commands and skills in \`.claude/\` and \`.agents/\` are files an agent reads.
Nothing in the app depends on them. Agent OS's own requirements are in
\`docs/agent-os/README.md\`; Design OS's are in \`docs/design-os/requirements.md\`.

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

The stack this project is built on. \`/plan-product\` reads this standard when it
asks whether a new project uses the same stack, and \`/shape-spec\` references it.

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
  const files: PackageFile[] = [...MANUALS]
  files.push({ path: 'requirements.md', content: REQUIRED_STACK })
  files.push({ path: 'agent-os/profiles/default/global/tech-stack.md', content: profileTechStack(project) })
  files.push({
    path: 'docs/README.md',
    content: `# Documentation that travels with the package

The tools that produced this handoff ship their own manuals. They are here,
verbatim, with their licences.

| Folder | What it is |
| --- | --- |
| \`docs/design-os/\` | Design OS — getting started, product planning, section design, export, usage, requirements, codebase implementation |
| \`docs/agent-os/\` | Agent OS v3 — the active commands, standards and shaping workflow |
| \`docs/agent-os-v2/workflows/\` | Agent OS v2 workflows — the modular instruction blocks v3 replaced with plan mode. Kept because the [workflows documentation](https://buildermethods.com/agent-os/workflows) still describes them; v3 does not compile them |
| \`docs/bm-skills/\` | The PRD Creator, Skill Builder, Design System and Favicon Creator skills, with the repo's agent instructions |
| \`docs/agentcanon/\` | The convention behind \`.agents/skills/\` and \`AGENTS.md\` |
| \`template/build-new/\` | The Build New starter's agent setup, conventions and licence |

## Where to start

- New to the package: \`../requirements.md\`, then \`../README.md\`
- New to the product: \`../product-overview.md\`
- New to the backend: \`../api/README.md\`, then \`../openapi.json\`
- New to the tooling: \`../TOOLKIT.md\`
`,
  })
  files.push({
    path: 'docs/agent-os-v2/README.md',
    content: `# Agent OS v2 workflows

Agent OS v3 — the version installed in this package — deliberately removed the
workflow compiler. From the v3 changelog:

> v3 refocuses the framework on what it does best — establishing and injecting
> standards — while deferring to modern AI tools for the parts they now handle
> better. Spec writing is best handled in plan mode; task breakdown and
> orchestration are handled by the agent.

The [workflows documentation](https://buildermethods.com/agent-os/workflows) is the
**v2** page. Its files are vendored here so nothing is lost, and so a team that
prefers the v2 process can install that profile instead:

\`\`\`
docs/agent-os-v2/workflows/planning/
docs/agent-os-v2/workflows/specification/
docs/agent-os-v2/workflows/implementation/
\`\`\`

The v2 repo's own README is kept beside this one as
\`docs/agent-os-v2/UPSTREAM-README.md\` — unedited, because the v2 README
describes the workflow compiler that these files depend on.

To use them, copy \`workflows/\` into \`agent-os/profiles/default/workflows/\` and
install with the v2 CLI (\`v2\` branch of buildermethods/agent-os). Do not add them to
a v3 install: v3 does not compile \`{{workflows/...}}\` placeholders, so they would
sit there unread.
`,
  })
  return files
}
