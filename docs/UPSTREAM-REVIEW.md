# Upstream review — every Builder Methods repository

ProdOps installs Builder Methods’ tools rather than paraphrasing them. All five public repositories were
read in full on **2026-10-25**, at the commits below, and every vendored file is compared byte for
byte against them by `npm run upstream-check`.

| Repository | Commit | Reviewed | Files ProdOps installs |
| --- | --- | --- | --- |
| [design-os](https://github.com/buildermethods/design-os) | `2f14c4611f06` (2026-10-07) | 2026-10-25 | 27 |
| [agent-os](https://github.com/buildermethods/agent-os) | `e892e61d3227` (2026-10-07) | 2026-10-25 | 21 |
| [bm-skills](https://github.com/buildermethods/bm-skills) | `7bee3357718c` (2026-10-08) | 2026-10-25 | 73 |
| [build-new](https://github.com/buildermethods/build-new) | `9321433499ee` (2026-10-07) | 2026-10-25 | 3 |
| [agentcanon](https://github.com/buildermethods/agentcanon) | `792bb0c9f750` (2026-10-07) | 2026-10-25 | 4 |

That is **128 files** copied verbatim, and the catalogue below says where each one lands.

## What each repository is for, and what ProdOps takes from it

### design-os

The five-phase design process: product planning, data shape, design tokens, shell, section specs, screen designs, screenshots and export.

**Shipped**

- ten slash commands, verbatim — `.claude/commands/design-os/` (10)
- the frontend-design skill, verbatim — `.agents/skills/frontend-design/SKILL.md`
- the eight docs pages — `docs/design-os/` (8)
- the product file contract the phases write — `product/` (8)

**Deliberately not shipped**

- **the React app that renders the phases** — ProdOps is that app, rebuilt as a compiler: it produces the same artefacts without a model, a key or a running Rails/React server. The commands are still installed so the phases can be re-run conversationally against a real agent.
- **shadcn/ui component library** — upstream renders its own workspace with it; ProdOps ships the tokens and components the *package* needs, not the workspace’s own UI kit.

**Verified**

- all 10 command files are identical to upstream, byte for byte
- the frontend-design SKILL.md is identical, byte for byte
- the exported package contains every path the export command specifies

### agent-os

Standards that are discovered in the codebase, indexed, and injected into every agent session; v3 defers spec writing to plan mode.

**Shipped**

- the five v3 commands, verbatim — `.claude/commands/agent-os/` (5)
- the standards index and product docs it writes — `agent-os/` (3)
- the v2 workflow blocks the docs still describe — `docs/agent-os-v2/workflows/` (13)

**Deliberately not shipped**

- **scripts/project-install.sh and scripts/common-functions.sh** — they install Agent OS into a Rails repo by writing files and symlinks; the package already contains the installed result, so running them would duplicate it.
- **profiles/default/global/tech-stack.md as shipped** — the package writes its own tech-stack profile from the compiled project instead of upstream’s placeholder.

**Verified**

- all 5 command files are identical, byte for byte
- the index format is folder → file → description, as upstream specifies
- the shape-spec command still saves documentation before code

### bm-skills

The four public skills: PRD Creator, Skill Builder, Design System and Favicon Creator.

**Shipped**

- bm-prd-creator, every step file — `.agents/skills/prd-creator/` (13)
- bm-skill-builder, every step and reference — `.agents/skills/skill-builder/` (9)
- bm-design-system, including its 50 reference files — `.agents/skills/design-system/` (50)
- bm-favicon-creator — `.agents/skills/favicon-creator/` (1)

**Deliberately not shipped**

- **.claude-plugin/marketplace.json and plugin.json** — they publish the repo to Claude’s plugin marketplace. The package leaves the installed skills in `.agents/skills/` (agentcanon) rather than claiming to be a plugin itself.
- **the `bm-` prefix on folder names** — upstream names the folders `bm-*` inside a marketplace that is also called bm-skills; the package uses the skill’s own name (`prd-creator`), which is what the SKILL.md `name:` field says.

**Verified**

- all 73 vendored files are identical, byte for byte, renaming the bm-* folders only
- each SKILL.md keeps its frontmatter name and description

### build-new

A Rails 8 + Inertia + React + PostgreSQL starter with a full design system and agent instructions.

**Shipped**

- the starter’s agent instructions, verbatim — `template/build-new/AGENTS.md`
- its README and .agents/setup — `template/build-new/`
- the Hatchbox deployment guide — `template/build-new/docs/`

**Deliberately not shipped**

- **the Rails app itself (models, controllers, Vite config)** — the package is framework-agnostic by design: it ships eight framework targets (React, Vue, Svelte, Preact, Solid, Angular, Lit, vanilla) and a dependency-free Node backend, so it cannot also be one Rails app. Build New is offered as the reference stack, not as the only one.
- **the design-system reference page and UI kit** — the package generates its own tokens and components per project; copying one starter’s kit would contradict the project’s compiled design.

**Verified**

- all 4 vendored files are identical, byte for byte
- the stack the package recommends matches the starter’s own AGENTS.md

### agentcanon

One canonical home for agent skills and instructions: real files in `.agents/skills/`, `AGENTS.md` as the source of truth, everything else symlinked.

**Shipped**

- the agentcanon-repo skill, verbatim — `.agents/skills/agentcanon-repo/SKILL.md`
- the agentcanon-manifest skill and its page — `.agents/skills/agentcanon-manifest/` (2)
- the convention itself, applied to the package — `AGENTS.md + .claude/skills → ../.agents/skills`

**Deliberately not shipped**

- **the committed `CLAUDE.md` and `.claude/skills` symlinks** — a zip cannot carry a symlink, so the package ships `scripts/link-agents.sh`, which recreates both after unzipping — the same end state, applied on the other side of the download.

**Verified**

- all 3 vendored files are identical, byte for byte
- the package writes AGENTS.md, and scripts/link-agents.sh creates both symlinks
- no real skill is written under .claude/skills anywhere in the package

## How this stays true

```bash
npm run upstream-check   # re-downloads all five repos and diffs every vendored file
npm run upstream-doc     # regenerates this document from src/export/upstream.ts
```

`upstream-check` fails on any drift: a changed command, a new step file, a renamed skill. Line endings are
normalised first (upstream is not consistent about CRLF), and nothing else is. When it fails, the vendored
copy is refreshed from the pinned upstream rather than edited by hand, so the package never ships a
half-paraphrased command.

Every file under `src/export/vendor/` is covered by an MIT licence, copied into the package next to it —
`docs/*/LICENSE` — with the copyright of CasJam Media LLC (Builder Methods) intact.

