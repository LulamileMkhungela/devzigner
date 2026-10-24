# Lula DevZign

**A deterministic design compiler.** One seed in, a complete product package out: brief, data model, design system, interactive screens, tests and an agent-ready handoff.

No API keys. No prompts. No blank page. Nothing to provide.

```
seed + archetype + genome  ──►  brief · roadmap · schema · tokens · 18 screens · audit · ZIP
```

---

## The workspace

The app is a five-phase product workspace. Each phase is a page, and each page is a numbered step rail — the same five steps from start to finish:

| Phase | Page | What it holds |
| --- | --- | --- |
| **Product** | `/` | Product vision (problems, personas, differentiators, success measures, principles, voice, non-goals) and the roadmap. Collapsible cards throughout, engine log at the bottom. |
| **Data Shape** | `/data-shape` | Entities in a two-column grid with fields and seeded rows, the relationships list, and the generated schema. |
| **Design** | `/design` | Colour roles, type roles, the full palette, scale, radii, elevation and motion, then the shell: navigation items and a **View Shell Design** preview. |
| **Sections** | `/sections` | The build order. Every row shows completion, priority, spec/data/screen/screenshot progress and a chevron into the section. |
| **Section** | `/sections/:id` | Four steps: Spec → Sample data → Screen designs → Screenshots. |
| **Screen design** | `/sections/:id/screen-designs/:name` | The rendered screen at 30 / 60 / 100 %, a live percentage readout, edge grips that resize from the centre, a light/dark switch and a fullscreen address. |
| **Export** | `/export` | Readiness checklist, the package card, what's included, Option A / Option B usage, the full audit and every file in the ZIP. |

Navigation is LulaZel's: a sticky 268 px rail with the five phases, collapsible section list and a product menu; a pill stepper across the top of every phase page; warm paper, rust accent, Inter, 14 px cards. The flow inside those slots is Design OS's, closely: phase stepper with completion ticks, numbered step rails, collapsible cards, dashed empty states with the command that fills them, a dismissible warning banner when earlier phases are incomplete, progress dots per section, resizable screen previews, and an export checklist with two usage paths.

### The prototype track

Under the workspace phases sits a second track — **Flows → System → Prototype → Wiki** with a token editor beside it. It is the "Bye Figma" half of the product: the place where the design system stops being a document and starts being the thing the prototype is built from.

| Page | What it does |
| --- | --- |
| **Flows** (`/flows`) | Four UX flows compiled from the screens (first value, core loop, exception, setup), each step pointing at a real route. Add a flow in the app and it is stored with the product, written into the wiki and versioned. |
| **System** (`/system`) | The decision record: tech stack per layer, a component registry (primitive / composite / pattern) where each entry declares the only tokens it may use, the AppShell regions and routes, and the data-layer rules. Four stack layers and the registry itself are **editable** — choices are stored with the product and follow into the export. |
| **Prototype** (`/prototype`) | A working AppShell with real routes and seeded records, assembled only from registry components — every block renders through a named component (`data-component`). Type to filter, sort a table, submit a form with validation, create a record, navigate the shell, and switch between the four compiled breakpoints (the `sm` view is the mobile layout). |
| **Token editor** (`/editor`) | Inline editing linked to the tokens: primary and accent hue, radius, spacing, shell and card style. Every change re-runs the compiler — ramps, contrast, semantic aliases, screens, audit — so nothing downstream can drift. |
| **Wiki** (`/wiki`) | The prototype wiki: product, flows, data layer, design system, components, shell, screens, stack, audit and handoff, plus branches and snapshots. Restore rebuilds the product deterministically. |
| **Coverage** (`/coverage`) | The parity audit. Every row rebuilds the export package and checks the artefact is really in it — Design OS's ten commands, the export contract, Agent OS's standards/specs, and each Figma complaint with its countermeasure. Nothing here is asserted in prose. |

The export grows to match: `src/data/types.ts`, `src/data/repository.ts` and `src/data/mock-adapter.ts` (a dummy data layer the UI can only reach through an interface), `src/components/app-shell.tsx`, `system/{stack,registry,app-shell,data-layer}` and a `wiki/` folder with a changelog. Branches are real snapshots in the browser; the exported folder is ready to commit, one worktree per exploration.

### Design OS and Agent OS, artefact by artefact

The full audit, with the file for every claim and the deliberate differences, is in [PARITY.md](./PARITY.md). The short version:

The export is the same file tree Design OS hands a coding agent, and the standards layer Agent OS expects:

| Design OS | Here |
| --- | --- |
| `/product-vision` `/product-roadmap` | `product-overview.md`, `product-brief.md`, `roadmap.md` |
| `/data-shape` `/sample-data` | `data-model.md`, `schema.sql`, `data-shapes/{README.md,overview.ts}`, `sections/*/sample-data.json`, `src/data/mock-adapter.ts` |
| `/design-tokens` `/design-shell` | `design-system/{tokens.css,tokens.dtcg.json,fonts.md,tailwind-colors.md}`, `shell/components/{AppShell,MainNav,UserMenu}.tsx` |
| `/shape-section` `/design-screen` | `sections/<id>/{README.md,tests.md,types.ts,sample-data.json,screenshot.svg,components/*.tsx}` |
| `/screenshot-design` | `sections/<id>/screenshot.svg` and `shell/screenshot.svg` — drawn from the compiled blocks, so never stale |
| `/export-product` | the ZIP, plus `prompts/{one-shot,section}-prompt.md` and `instructions/{one-shot-instructions, incremental/01-shell, NN-section}.md` |
| Planning outputs | `product/{product-overview,product-roadmap}.md`, `product/data-shape/`, `product/design-system/{colors,typography}.json`, `product/shell/spec.md` |
| Slash commands | `commands/*.md` — the ten Design OS commands plus four Agent OS commands, ready for `.claude/commands/` |
| Agent OS `/plan-product` | `agent-os/product/{mission,roadmap,tech-stack}.md` |
| Agent OS `/discover-standards` `/index-standards` | `agent-os/standards/{ui,data,quality,accessibility}/*.md` + `index.yml` with descriptions |
| Agent OS `/shape-spec` | `agent-os/specs/<date>-<section>/{shape,plan,references,standards}.md` + `visuals/*.svg` |

Generated components are **props-only** (no data imports, no routing), responsive at every breakpoint in the token file, and typechecked in CI: `npm run export-check` writes them to disk and runs `tsc` against them for three archetypes.

### What was wrong with the tools this replaces

| Complaint | Countermeasure |
| --- | --- |
| Variables that only exist inside one tool | `design-system/tokens.dtcg.json` — W3C DTCG `$value`/`$type` primitives, readable by Figma, Tokens Studio and Style Dictionary |
| Layouts that only exist at one width | Four breakpoints compiled as tokens, audited (`Responsive contract`), used by every exported component; nav collapses, tables scroll inside their card |
| Autolayout that guesses margins | The compiler emits the shell, content width, density, grid and spacing scale; components consume `--space-*`, never ad-hoc margins |
| Hundreds of hand-crafted component states | States come from variant axes on registry components; screens are composed from the registry, never drawn once-off |
| Inputs that are pictures of inputs | The prototype runs real `<input>`, `<select>`, `<textarea>` and `<button>` elements: type to filter, sort a table, submit a form with validation, create a record, navigate the shell |
| Design knowledge lost in a chat | `wiki/` + `agent-os/` ship product, flows, system, standards and specs with the code, versioned by snapshots and branches |

A new artefact that *is* pre-filled: screenshots. They used to be the one step left to a person; they are now rendered from the compiled blocks, which is why they can be regenerated and why every screen has one.

---

## Why this exists

Design-first workflows (Design OS, spec-driven development, "plan before you prompt") fixed the biggest problem with AI-assisted building: coding agents were being asked to invent the product and implement it at the same time. The fix was a design phase that produces a handoff package.

But most implementations of that idea have a hidden dependency: **you must sit in a chat with a model, answer questions, and supply the product's domain knowledge before anything exists.** If you have no idea, no interviews, no copy, no data — you get a blank screen, or generic filler.

Lula DevZign removes that dependency. It ships twelve domain packs (marketplace ops, clinical scheduling, dispatch, money ops, hiring, events and more), each with real entities, status machines, field definitions, requirements, risks and copy. From those, a **pure compiler** generates a product that is internally consistent — and then proves it with an audit that is computed, not asserted.

The result is a workspace you can open on a Monday morning with zero preparation and still walk away with something a senior designer would recognise as a design system and a product spec.

---

## What it produces

| Artefact | Substance |
| --- | --- |
| **Product brief** | Problem framing with cost-of-inaction, 2 personas (labelled illustrative), jobs-to-be-done, 4 metrics, differentiators, 4 risks with mitigations, principles, voice, non-goals |
| **Roadmap** | 4 phases with horizons, outcomes, entry/exit conditions and mapped sections |
| **Data model** | 4–5 entities, 30–40 typed fields, foreign keys, 40–60 seeded sample rows, runnable PostgreSQL DDL with indexes and check constraints |
| **Design system** | 7 contrast-checked colour families × 11 stops, semantic tokens (light + dark), 3 type roles, 7-step scale, space/radius/elevation/motion scales, layout shell, 10-component inventory |
| **Sections & screens** | 5–7 feature areas, 12–18 screens built from real blocks, requirements with IDs and priorities, 4 states per screen, acceptance criteria, framework-agnostic tests |
| **Audit** | 24 checks across accessibility, system, coverage and handoff — contrast ratios are calculated from the actual hex values |
| **Handoff** | ~200 files: markdown specs, generated React components, prompts, milestones, screenshots, Agent OS standards and specs, `schema.sql`, `tokens.css`, `tailwind-theme.css`, `tokens.json`, per-section specs, tests, an implementation brief for a coding agent, `audit.md`, `devzign.json` |

Everything is text. Everything is diffable. The ZIP is typically 200–800 KB depending on how many components and screenshots the product carries.

---

## The three inputs

### 1. Seed
A number. It deterministically drives every random choice. `seedPhrase()` turns it into a readable handle (`amber-atlas`, `quiet-forge`) so you can talk about a compile without reading a hash.

Each module gets its own derived stream (`brief`, `roadmap`, `data`, `design`, `sections`), which means **re-rolling the colour system never changes a requirement**. That isolation is what makes the re-roll buttons safe.

### 2. Archetype
Twelve domain packs, each with its own vocabulary, entities, status sets, personas, risks and metric language:

| ID | Domain | Example product |
| --- | --- | --- |
| `marketplace` | Multi-vendor commerce | Soko, Stall & Co |
| `saas` | B2B delivery workspace | Relay, Cadence |
| `crm` | Sales pipeline | Signal Desk, Baton |
| `learning` | Cohort learning | Forma, Cohort |
| `clinic` | Clinic operations | Klinik, Sage Health |
| `fintech` | Money & budgets | Tally, Ledgerly |
| `logistics` | Dispatch & fleet | Routewell, Haul |
| `creator` | Content studio | Pressline, Plotline |
| `property` | Property management | Blockhouse, Keystone |
| `fieldops` | Field service | Callout, Fieldkit |
| `peopleops` | People operations | Cadre, Roster |
| `events` | Event operations | Marquee, Gather |

An archetype is not a template you fill in. It is a domain model with opinions: constrained status transitions, realistic entity relationships, and the failure modes that actually cost teams money.

### 3. Genome
Five 0–100 dials that derive the entire visual system:

| Dial | Low | High | What it changes |
| --- | --- | --- | --- |
| Density | airy | compact | spacing rhythm, type sizes, shell (sidebar → rail) |
| Warmth | cool | warm | neutral hue bias, canvas tint |
| Contrast | soft | bold | ink strength, primary lightness, card style |
| Expression | quiet | expressive | saturation, type ratio, motion durations |
| Geometry | sharp | rounded | the entire radius scale |

Change one dial and the design system re-derives: ramps, semantic tokens, shadows, motion, card style, type pairing. Nothing is patched by hand.

---

## How the audit stays honest

The score is a weighted calculation over checks that read the artefacts:

- **Contrast** is computed with WCAG relative luminance: primary on white, ink on canvas, muted text, and the dark canvas. If the raw primary fails 4.5:1, the compiler *darkens it in HSL until it passes* and says so in the rationale.
- **Schema** is parsed back out of the generated SQL — table count must equal entity count.
- **Coverage** counts sections with ≥2 screens, screens with acceptance criteria, must-have requirements, entity references, and test statements.
- **Design tension** is surfaced, not hidden: compact density raises a touch-target warning; above-budget motion raises a motion warning.

Pass = full weight, warning = half, fail = zero. A comfortable genome scores 100; a compact, expressive genome scores 96 with two named warnings. The number can go down, which is the only reason it means anything.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build and verify:

```bash
npm run build          # tsc + vite production build
npm run render-check   # server-renders every view + proves the export contract
npm run export-check   # writes generated components to disk and typechecks them
npm run smoke          # mounts the app in jsdom and clicks through it, including real form input
npm run qa             # compiles all 12 archetypes × 3 seeds, checks invariants
npm run check          # all of the above, then the production build
```

There is no backend, no database and no network call at runtime. Projects are stored in `localStorage` (with automatic pruning if the quota is reached). Clearing site data clears projects; use **Export → Download package** to keep anything you care about.

The first load compiles the starter product (marketplace, seed `112233`) and captures its screens, so all five phases are complete before you touch anything. The **New product** dialog is optional: one line of description, or none at all.

---

## Architecture

```
src/
  engine/                # the compiler — pure functions, zero React
    packs.ts             # archetype registry
    packs1.ts packs2.ts  # 12 domain packs (entities, sections, copy, metrics)
    rng.ts               # mulberry32 + hash-based seed derivation
    color.ts             # HSL/hex, WCAG luminance, contrast forcing, ramps
    brief.ts             # problems, personas, jobs, metrics, risks
    dataModel.ts         # entities → fields → seeded rows → relationships → SQL
    design.ts            # genome → colours, type, scale, tokens (CSS/Tailwind/JSON)
    screens.ts           # screen kinds → blocks built from real records
    sections.ts          # requirements, tests, out-of-scope per section
    roadmap.ts           # priority → phases with entry/exit conditions
    audit.ts             # 22 computed checks + weighted score
    index.ts             # compileProject() — the only entry point
  export/package.ts      # assembles the package: specs, SQL, tokens, components, prompts
  export/handoff.ts      # generated React components, prompts, milestones, design-system notes
  export/agentos.ts      # Agent OS product docs, indexed standards, specs, design skill
  export/screenshots.ts  # deterministic SVG screenshots drawn from the compiled blocks
  components/
    AppPreview.tsx       # renders a screen using the project's own tokens
    PreviewStage.tsx     # 30/60/100 % device canvas, edge grips, fullscreen
    ui.tsx               # phase header, step rail, collapsibles, empty states, banner
  views/                 # the five phases + FlowsPage, SystemPage, PrototypePage,
                         # EditorPage, WikiPage
  engine/flows.ts        # user flows derived from compiled screens
  engine/system.ts       # stack, component registry, AppShell, data layer
  export/systemFiles.ts  # generated src/data/*, app-shell.tsx, system/*, wiki/*
  views/CoveragePage.tsx # parity audit, verified against the built package
  styles/app.css         # LulaZel-derived shell: rail, paper, rust accent, pill stepper
  styles/preview.css     # the generated artefact's own token-driven styles
  lib/                   # store (projects, captures, token edits, versions), router,
                         # progress, wiki, formatting
```

The compiler is deliberately separate from the UI. `compileProject()` takes plain data and returns a plain object; you could run it in a worker, a CLI or a test with no DOM.

```ts
import { compileProject } from './src/engine'

const project = compileProject({
  idea: 'a marketplace for township artisans', // optional
  seed: 741293,
  archetypeId: 'marketplace',
  genome: { density: 44, warmth: 68, contrast: 54, expression: 44, geometry: 30 },
  currency: 'ZAR',
})
```

Same inputs → byte-identical package, forever. `devzign.json` in the export carries the inputs so a package can be regenerated and diffed.

---

## What this is not

- **Not user research.** Personas and quotes are synthetic and labelled as such, in the product and in the export. The brief explicitly tells you to validate with three real interviews before locking a roadmap.
- **Not a benchmark.** Targets are directional design goals, not measured averages.
- **Not a replacement for taste.** It compiles a defensible starting system; choosing which parts to keep is still a human job.
- **Not affiliated with Builder Methods, Design OS or LulaZel.** The five-phase flow and interaction model follow Design OS; the shell's colours, navigation and page structure follow LulaZel. The implementation is independent: no prompts, no agent runtime, no model dependency, no accounts.

---

## Design principles of the compiler

1. **Determinism over novelty.** A design decision you cannot reproduce is not a decision.
2. **Artefacts must be checkable.** If a claim cannot be computed from the output, it does not belong in the audit.
3. **Module isolation.** Re-rolling one module must not silently rewrite another.
4. **Honest seams.** Synthetic personas, directional metrics and unimplemented components are labelled, not disguised.
5. **The handoff is the product.** The screens are a demonstration of the spec; the spec is what you ship from.

---

*Built as a working answer to a simple question: what if the design phase required nothing from you but a seed?*
