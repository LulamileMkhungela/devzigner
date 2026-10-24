# Parity report — Design OS, Agent OS, and the Figma complaints

This is the coverage audit for **Lula DevZign**. Every row is verifiable two ways:

- in the app, at **`#/coverage`** — each row rebuilds the export package and checks the artefact is inside it;
- in CI, via `npm run check` (render-check → export-check → walkthrough → example-app → smoke → qa → production build).

Nothing below is a promise. The generated React is written to disk and typechecked
(`npm run export-check`), the parity rows are recomputed on every visit, and the
prototype interactions are clicked through in jsdom (`npm run smoke`).

A representative product (clinic, seed 4242) exports:

| | |
| --- | --- |
| Files | **248** |
| Size | ~**1.0 MB** of text |
| Sections / screens | 7 / 18 |
| Generated components | 22 `.tsx`, all typechecked |
| Screenshots (SVG) | 26 |
| Tests specs | 7 (`sections/*/tests.md`) |
| Instructions | 9 (`instructions/one-shot-instructions.md` + `01-shell` + one per section) |
| Agent OS files | 69 (specs, standards, product docs, skills) |
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
| Slash commands | ✅ | `.claude/commands/design-os/*.md` — the ten Design OS commands, named and placed as upstream |
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
| Skills | ✅ `agent-os/skills/frontend-design/SKILL.md` |

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

## 4. The Figma complaints, answered

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
| Needing "Figma Draw" | There is no freeform canvas by design: the editable surface is the token editor and the flow builder, and everything downstream recompiles | `/editor`, `/flows` |

### What is *not* claimed

- This is not a vector drawing tool, and it does not try to be one.
- Personas and quotes are illustrative and labelled as such; metrics are targets.
- Screenshots are SVG renders of the compiled screens, not photographs of a browser.

---

## How the claims are checked

```bash
npm run render-check   # SSR every view; verifies the export contract file by file
npm run export-check   # writes generated components to disk and typechecks them (3 archetypes)
npm run walkthrough    # jsdom: the five phases, start to finish, with no user input
npm run example-app    # builds the exported package as a real Vite + Tailwind app
npm run smoke          # jsdom: routes, dialogs, token edits, real form input, breakpoints
npm run qa             # 12 archetypes × 3 seeds: invariants + audit score
npm run check          # all of the above, then the production build
```

`npm run check` currently ends with:

```
all views render
export check passed
walkthrough complete: idea → package with zero user input
ok  Careline: shell + 6 sections built with vite + tailwind
no console errors
bad: 0
✓ built in ~4s
```
