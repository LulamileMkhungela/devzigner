# Parity report — Design OS, Agent OS, the free tools, and the backend

This is the coverage audit for **Lula DevZign**. Every row is verifiable two ways:

- in the app, at **`#/coverage`** — each row rebuilds the export package and checks the artefact is inside it;
- in CI, via `npm run check` (render-check → export-check → walkthrough → example-app → smoke → qa → production build).

Nothing below is a promise. The generated React is written to disk and typechecked
(`npm run export-check`), the parity rows are recomputed on every visit, and the
prototype interactions are clicked through in jsdom (`npm run smoke`).

A representative product (clinic, seed 4242) exports:

| | |
| --- | --- |
| Files | **331** |
| Size | ~**1.4 MB** of text |
| Sections / screens | 7 / 18 |
| Generated components | 22 `.tsx`, all typechecked |
| Screenshots (SVG) | 26 |
| Tests specs | 7 (`sections/*/tests.md`) |
| Instructions | 9 (`instructions/one-shot-instructions.md` + `01-shell` + one per section) |
| Agent OS files | 69 (specs, standards, product docs, skills) |
| Free-tool files | 78 under `.agents/skills/`, 4 under `template/build-new/` |
| Backend files | 15 (`server/`), 11 executable tests |
| Slash commands | 15 (10 Design OS, 5 Agent OS, verbatim) |
| Audit checks | 24 |

---

## 1. Design OS — the ten commands

Design OS is a set of slash commands plus an export contract. Both are reproduced.

| Design OS command | What it produces there | Where it is here |
| --- | --- | --- |
| `/product-vision` | problem, personas, value proposition | `product-brief.md`, `product/product-overview.md` |
| `/product-roadmap` | phased plan mapped to features | `roadmap.md`, `product/product-roadmap.md` |
| `/data-shape` | entities, fields, relationships | `data-model.md`, `schema.sql`, `data-shapes/{README.md,overview.ts}`, `product/data-shape/data-shape.md` |
| `/design-tokens` | colours, typography, Tailwind config | `design-system/{tokens.css,tokens.dtcg.json,fonts.md,tailwind-colors.md}`, `product/design-system/{colors,typography}.json` |
| `/design-shell` | shell spec + shell components | `shell/README.md`, `shell/components/{AppShell,MainNav,UserMenu,index}.tsx`, `product/shell/spec.md`, `shell/screenshot.svg` |
| `/shape-section` | a spec per section | `sections/<id>/README.md`, `specs/<id>/{requirements,plan,tasks}.md`, `agent-os/specs/<date>-<section>/shape.md` |
| `/sample-data` | seeded rows per section | `sections/<id>/sample-data.json`, `src/data/mock-adapter.ts` |
| `/design-screen` | a designed screen per route | `sections/<id>/components/<Screen>.tsx` |
| `/screenshot-design` | a visual per section | `sections/<id>/screenshot.svg`, `agent-os/specs/*/visuals/*.svg` |
| `/export-product` | the zip | Download on **Export**, plus `prompts/`, `instructions/`, `.claude/commands/{design-os,agent-os}/` |

### Export contract, file by file

| Design OS file | Status here | Notes |
| --- | --- | --- |
| `product-overview.md` | ✅ | Also `product-brief.md` and `roadmap.md` |
| `product-overview.md` | ✅ | Summary, planned sections, product entities, design system, implementation sequence |
| `prompts/one-shot-prompt.md` | ✅ | The upstream wording: `@product-plan/…` references, before-you-begin questions, ask for a plan before code |
| `prompts/section-prompt.md` | ✅ | The `SECTION_NAME / SECTION_ID / NN` variable template |
| `instructions/one-shot-instructions.md` | ✅ | `## About This Handoff` preamble, testing, product overview, every milestone, final pass |
| `instructions/incremental/01-shell.md`, `02-<section>.md…` | ✅ | One file per section, each opening with `> **Provide alongside:** … > **Prerequisites:** … > **Milestone:** N of M` |
| `design-system/tokens.css` | ✅ | Light + dark semantic tokens |
| `design-system/tailwind-colors.md` | ✅ | Theme wiring, breakpoints, dark mode |
| `design-system/fonts.md` | ✅ | Families, weights, stacks, loading |
| `data-shapes/README.md`, `overview.ts` | ✅ | Component prop contracts |
| `shell/components/{AppShell,MainNav,UserMenu,index}.tsx` | ✅ | Layout-only, no data fetching |
| `shell/screenshot` | ✅ `.svg` | Rendered from compiled blocks (Design OS ships PNG) |
| `sections/<id>/README.md` | ✅ | Overview, priority, user flows with outcomes, design decisions, data shapes, callback props table, screens |
| `sections/<id>/tests.md` | ✅ | `# Test Specs`, user-flow success + failure, empty states, component interactions, edge cases, accessibility, sample data |
| `sections/<id>/types.ts` | ✅ | Typed props per component |
| `sections/<id>/sample-data.json` | ✅ | Real seeded rows, not lorem |
| `sections/<id>/components/*.tsx` | ✅ | Props-only, responsive, typechecked |
| `sections/<id>/screenshot` | ✅ `.svg` | One per section |
| `product/` planning folder | ✅ | `product-overview`, `product-roadmap`, `data-shape/`, `design-system/*.json`, `shell/spec.md` |
| Slash commands | ✅ | `.claude/commands/design-os/*.md` — the ten Design OS commands, vendored verbatim (`vendor/designOsCommands.ts`) |
| `.claude/skills/frontend-design/SKILL.md` | ✅ | Design OS's own skill, verbatim; the compiled per-product one sits beside it at `.claude/skills/project-design-system/SKILL.md` |
| `.claude/commands/agent-os/*.md` | ✅ | The five Agent OS commands, copied verbatim from `buildermethods/agent-os` |

**Deliberate difference:** screenshots are SVG, drawn deterministically from the
compiled screen blocks and tokens. They cannot go stale and they need no
headless browser; a PNG would add a build dependency for no extra information.

---

## 2. Agent OS — standards, product docs, specs

| Agent OS | Where it is here |
| --- | --- |
| `/plan-product` → `agent-os/product/{mission,roadmap,tech-stack}.md` | ✅ all three, written from the brief, roadmap and stack; the command text (including the existing-docs *Start fresh / Update specific / Cancel* choice and the `To be defined` fallback) ships verbatim |
| `/discover-standards` → `agent-os/standards/<domain>/*.md` | ✅ 8 rules across `ui`, `data`, `quality`, `accessibility`, alphabetized |
| `/index-standards` → `agent-os/standards/index.yml` | ✅ `folder: { file: description }`, one line per rule |
| `/inject-standards` | ✅ `agent-os/specs/*/standards.md` inlines the full rule bodies it cites |
| `/shape-spec` → `specs/<date>-<slug>/{plan,shape,references,standards}.md` + `visuals/` | ✅ per section, with the screens' SVGs; Task 1 saves the documentation |
| Commands | ✅ `.claude/commands/agent-os/{discover-standards,index-standards,inject-standards,plan-product,shape-spec}.md` |
| Config | ✅ `agent-os/config.yml` — `version: 3.0`, `default_profile: default` |
| Skills | ✅ `.claude/skills/frontend-design/SKILL.md` (Design OS, verbatim) + `.claude/skills/project-design-system/SKILL.md` (compiled) |

The standards are not generic advice: they are derived from the compiled system
(the real token names, the real breakpoints, the real entity count), and each one
is a rule plus the reason, in the shape Agent OS prescribes.

---

## 3. The process, run from start to finish

The four Design OS steps are not just available — they are executed on every `npm run check`,
with no idea typed, no question answered, and no key configured.

`npm run walkthrough` mounts the real app in jsdom and asserts, in order:

1. **First load** — a product exists with a brief, 5 entities, ≥5 sections, ≥2 screens each, 4 flows.
2. **Product Planning** — the vision and the roadmap render, and the handoff to the next step exists.
3. **Data Shape** — every entity is on the page and the schema is generated.
4. **Design System** — the primary and accent ramps, the role count, the typography and the link into shell design render.
5. **Section Design** — the four-step rail, requirements and sample data, a captured screen, and a screen design that opens.
6. **Export** — the readiness board has no failures, the audit renders, and the package carries the whole Design OS contract, one component per screen, the Agent OS layer and a screenshot per section.

`npm run example-app` closes the loop by building the thing the export promises. It writes the
package into `node_modules/.example-app`, adds `vite`, `react` and `@tailwindcss/vite`, copies
`design-system/tokens.css`, `shell/components/`, `sections/` and `data-shapes/overview.ts`, generates a
page per section from the exported components and `sample-data.json`, composes `App.tsx` around
`AppShell`, and runs a real `vite build`. A broken handoff fails the build:

```
ok  Careline: shell + 6 sections built with vite + tailwind
```

(One product per run; `--archetype=` picks another, `--keep` leaves the scratch project in place.)

---

## 4. The free tools, all eight

Every tool on buildermethods.com/tools is installed. The skill files are vendored
verbatim from their repositories, so the steps below are the tools' own.

| Tool | Kind | Installed at | Evidence |
| --- | --- | --- | --- |
| PRD Creator | Agent skill | `.agents/skills/prd-creator/` (13 files) | `/coverage`, `/tools` |
| Skill Builder | Agent skill | `.agents/skills/skill-builder/` (9 files) | `/coverage`, `/tools` |
| Design System | Agent skill | `.agents/skills/design-system/` (50 files) | `/coverage`, `/tools` |
| Build New | Template | `template/build-new/` (AGENTS.md, `.agents/setup`, docs) | `/coverage`, `/tools` |
| agentcanon | Convention | `.agents/skills/agentcanon-{repo,manifest}/`, `AGENTS.md`, `scripts/link-agents.sh` | `render-check` asserts `.claude/skills` holds no real skill |
| Favicon Creator | Agent skill | `.agents/skills/favicon-creator/` | `/coverage`, `/tools` |
| Agent OS | Workflow | `agent-os/` + `.claude/commands/agent-os/` (5) | `/coverage` |
| Design OS | Workflow | `product-plan/` + `.claude/commands/design-os/` (10) | `/coverage` |
| The cloned site | Clone | `site/` — 92 pages with content, served at `/` offline | `npm run site-check` (links, assets, no shells, no challenge pages) |
| Framework targets | Export | React, Vue 3, Svelte 5, Preact, Solid, Angular, Lit, Web Components from one product | `export-check` compiles each with its own compiler |
| Manuals | Documentation | `requirements.md`, `docs/` (40 files: Design OS, Agent OS v3, Agent OS v2 workflows, bm-skills, agentcanon, licences) | `render-check`, `npm test` |

The **Tools** page reads the steps out of the shipped `SKILL.md` headings rather
than a hand-written list, so a tool whose process changes changes the page.

## 5. The backend and its tests

| Piece | Where | Proof |
| --- | --- | --- |
| Business rules | `business-logic.md`, `server/src/rules.ts` | `server/src/tests/rules.test.ts` |
| Validation, enums, foreign keys | `server/src/validate.ts` | the 422 test in `api.test.ts` |
| Business layer + event log | `server/src/services.ts` | the transition + events tests |
| HTTP API | `server/src/http.ts`, `server/API.md` | `api.test.ts` drives it without a socket |
| Repository and seeds | `server/src/repository.ts`, `server/src/seed.ts` | pagination + list tests |
| Frontend adapter | `src/data/http-adapter.ts` | typechecks against `DataLayer` in `export-check` |
| API contract | `openapi.json` (OpenAPI 3.1), `api/README.md` | `npm test` parses it and checks every entity has list/create/read/patch/delete plus its transition |

`export-check` writes the generated server to disk, typechecks it, then runs its
suite with `node --experimental-strip-types --test`. All 11 generated tests pass
for two archetypes on every `npm run check`.

## 6. Quality, computed

| Complaint | Countermeasure | Where to check |
| --- | --- | --- |
| Variables that only exist inside one tool | W3C **DTCG** token file with typed `$value`/`$type` for colour, dimension, font family, duration | `design-system/tokens.dtcg.json`, `/coverage` |
| Designs that only exist at one width | Four breakpoints compiled as tokens, documented, audited and used by every generated component; the prototype switches between them | `design.breakpoints`, audit row *Responsive contract*, `/prototype` |
| Autolayout that guesses margins | The compiler emits shell, content width, density, grid and the spacing scale; components consume `--space-*` | `design-system.md`, `tailwind-colors.md` |
| Hundreds of hand-crafted component states | States come from variant axes on registry entries; screens compose the registry | `system/registry.json`, `data-component` on every prototype block |
| Inputs that are pictures of inputs | The prototype contains real `input`/`select`/`textarea`/`button`: type to filter, sort, submit with validation, create a record, navigate | `AppPreview`, `npm run smoke` |
| A page assembled from bespoke UI | Every block renders through a named registry component; the mapping is exported and tested | `engine/system.ts`, `render-check` |
| Design knowledge lost in a chat | Wiki + Agent OS layer shipped beside the code, versioned by snapshots/branches; worktree workflow documented | `wiki/`, `agent-os/`, `git-workflow.md` |
| Needing a model, a key, or data to start | The whole package is a pure function of seed + archetype + genome | `devzign.json`, `npm run qa` (36 runs, 0 failures) |
| No freeform canvas | By design: the editable surface is the token editor and the flow builder, and everything downstream recompiles | `/editor`, `/flows` |

### What is *not* claimed

- This is not a vector drawing tool, and it does not try to be one.
- Personas and quotes are illustrative and labelled as such; metrics are targets.
- Screenshots are SVG renders of the compiled screens, not photographs of a browser.

---

## How the claims are checked

```bash
npm run render-check   # SSR every view; verifies the export contract file by file
npm run export-check   # writes generated components to disk and typechecks them (3 archetypes)
npm run test           # unit tests: determinism, data integrity, tools, backend contract
npm run walkthrough    # jsdom: the five phases, start to finish, with no user input
npm run example-app    # builds the exported package as a real Vite + Tailwind app
npm run smoke          # jsdom: routes, dialogs, token edits, real form input, breakpoints
npm run qa             # 12 archetypes × 3 seeds: invariants + audit score
npm run check          # all of the above, then the production build
npm run standalone     # one self-contained HTML file — script, styles and fonts inlined
```

`npm run check` currently ends with:

```
all views render
# pass 12
export check passed
walkthrough complete: idea → package with zero user input
ok  Careline: shell + 6 sections built with vite + tailwind
no console errors
bad: 0
✓ built in ~4s
```
