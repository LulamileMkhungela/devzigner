<img src="public/prodops-wordmark.svg" alt="ProdOps" width="260" />

# ProdOps

**A product-planning and UI-design framework, built by [Lulamile Mkhungela](https://github.com/LulamileMkhungela).**

ProdOps is where a product idea becomes something an agent can build: the vision, the data
shape, the design system, the sections, the screens and the handoff — decided in that order,
written to files, and compiled in the browser with no model, no key and no data leaving the page.

It sits between design thinking and generative AI. You describe the problem; ProdOps asks for
the decisions a designer would make, writes each artefact, and refuses to tick a stage until
you have reviewed it. The output is a working prototype made only of design-system components,
plus a package an implementation agent can build from without inventing UI.

```
idea → product → data shape → design system → sections → screens → export
```

---

## The workspace

The shell is two panes. The process rail on the left holds the five stages, in order, each with
its own completion mark and a meter of how far the process has got; the work is on the right.
The rail also holds the prototype track, the section list and the account. Below 900px the rail
becomes a drawer opened from the top bar.

| Stage | Page | What it holds |
| --- | --- | --- |
| **Product** | `/` | The description field, then vision (problems, personas, differentiators, success measures, principles, voice, non-goals) and the roadmap. |
| **Data Shape** | `/data-shape` | Entities with fields and seeded rows, the relationships, and the generated schema. |
| **Design** | `/design` | Colour roles, type roles, palette, scale, radii, elevation, motion, then the shell and its preview. |
| **Sections** | `/sections` | The build order. Every row shows completion, priority and spec/data/screen/screenshot progress. |
| **Section** | `/sections/:id` | Four steps: Spec → Sample data → Screen designs → Screenshots. |
| **Screen design** | `/sections/:id/screen-designs/:name` | The rendered screen at 30 / 60 / 100 %, edge grips that resize from the centre, a light/dark switch, fullscreen. |
| **Export** | `/export` | Readiness checklist, package card, what is included, the two usage paths, the audit and every file in the ZIP. |

Every phase page has the same anatomy: header (where you are), the how-to guide (what this stage
decides), the artefacts, then the completion control. The header states position — *Stage 2 of 5 ·
Data Shape* — rather than repeating the rail as links, because the rail is where the stages are
clicked.

### The prototype track

Beside the five stages: **Tools → Personas → User Flows → Tech Stack → Prototype → Wiki →
Coverage**, with the token editor next to them.

| Page | What it does |
| --- | --- |
| **Tools** (`/tools`) | The eight builder tools, each with the steps it actually runs, parsed from the tool's own instruction file, and the file each step lives in. |
| **Personas** (`/personas`) | Each persona with its goal, pain and quote, joined to the flows it walks and the screens those flows land on — plus who the product is explicitly not for. |
| **User Flows** (`/flows`) | Four UX flows compiled from the screens — first value, core loop, exception, setup — each step pointing at a real route. |
| **Tech Stack** (`/system`) | The decision record: tech stack per layer, the component registry (primitive / composite / pattern) with the tokens each entry may use, the AppShell regions, the data-layer rules. Editable. |
| **Prototype** (`/prototype`) | A working AppShell with real routes and seeded records, assembled only from registry components. Type to filter, sort a table, submit a validated form, create a record, switch breakpoints. |
| **Token editor** (`/editor`) | Primary and accent hue, radius, spacing, shell and card style. Every change re-runs the compiler, so nothing downstream can drift. |
| **Wiki** (`/wiki`) | The product wiki: product, flows, data layer, design system, components, shell, screens, stack, audit and handoff, plus branches and snapshots. |
| **Coverage** (`/coverage`) | The parity audit. Every row rebuilds the package and checks the artefact is really in it. Nothing here is asserted in prose. |

---

## What the package contains

`npm run build` compiles a product; **Export → Download** writes it out. It is a folder, not a PDF.

| Path | What it is |
| --- | --- |
| `product-overview.md`, `roadmap.md`, `product/` | the product's decisions, as the first thing an agent reads |
| `design-system/` | `tokens.json` (W3C DTCG), `tokens.css`, the component registry and the shell |
| `sections/<id>/` | `spec.md`, `sample-data.json`, one props-based component per screen, `tests.md`, screenshots |
| `src/data/` | the data layer behind an interface: `types.ts`, `repository.ts`, `mock-adapter.ts`, `http-adapter.ts` |
| `src/shell/` | `AppShell`, `MainNav`, `UserMenu` — built from tokens, not literals |
| `server/` | a dependency-free reference API on Node's own test runner, with the status machine from the data shape |
| `.agents/` | the fifteen commands, the four skills, and the agents canon |
| `standards/` | mission, roadmap, tech stack, the standards index and spec folders |
| `TOOLKIT.md`, `docs/` | the tools, their real steps, the guides and the licences |
| `product-plan/` | the handoff: instructions, prompts, milestones and the one-shot prompt |

The export is not locked to React. `npm run export-check` compiles the same product to React,
Vue 3, Svelte 5, Preact, Solid, Angular, Lit and web components, each with its own compiler.

### The fifteen commands

One folder, one markdown file per command — ten for the five stages, five for the standards
layer. Any agent that reads markdown commands can run them; there is nothing to install.

| Stage commands | Standards commands |
| --- | --- |
| `/prodops:product-vision`, `/prodops:product-roadmap` | `/prodops:plan-product` |
| `/prodops:data-shape` | `/prodops:discover-standards`, `/prodops:index-standards` |
| `/prodops:design-tokens`, `/prodops:design-shell` | `/prodops:inject-standards` |
| `/prodops:shape-section`, `/prodops:sample-data`, `/prodops:design-screen`, `/prodops:screenshot-design` | `/prodops:shape-spec` |
| `/prodops:export-product` | |

### The eight builder tools, installed

| Tool | Kind | Installed at |
| --- | --- | --- |
| **PRD Creator** | agent skill | `.agents/skills/prd-creator/` |
| **Skill Builder** | agent skill | `.agents/skills/skill-builder/` |
| **Design System** | agent skill | `.agents/skills/design-system/` |
| **Starter** | template | `template/starter/` |
| **Agents canon** | convention | `.agents/skills/agents-{repo,manifest}/`, `AGENTS.md`, `scripts/link-agents.sh` |
| **Favicon Creator** | agent skill | `.agents/skills/favicon-creator/` |
| **Standards** | workflow | `standards/` + the five standards commands |
| **ProdOps flow** | workflow | `product-plan/` + the ten stage commands |

Skills live once, in `.agents/skills/`; instructions live once, in `AGENTS.md`; `CLAUDE.md` and
`.claude/skills` are symlinks created by `scripts/link-agents.sh`.

---

## Running it

```bash
npm install
npm run dev            # http://localhost:5173
```

Build and verify:

```bash
npm run build          # tsc + vite production build
npm run render-check   # server-renders every view, checks the shell, the animation and the export contract
npm run export-check   # writes generated components to disk and typechecks them
npm run smoke          # mounts the app in jsdom and clicks through it, including real form input
npm run qa             # compiles all 12 archetypes × 3 seeds, checks invariants
npm run walkthrough    # the whole process in jsdom with zero user input: idea → package
npm run browser-check  # the production bundle, seven storage scenarios, no console errors
npm run example-app    # builds the exported package into a real Vite + Tailwind app
npm run check          # all of the above, then the production build
npm run standalone     # one self-contained HTML file — script, styles and fonts inlined
npm run preview:static # serve dist/ on 0.0.0.0:5173 — no dev server, no websocket
npm run snapshot       # every page as one static HTML file — no JavaScript at all
npm run site-check     # the reference site copy: pages, links, and the restored behaviour
npm run preview:site   # the reference copy at / and the workspace at /workspace/
```

There is no backend, no database and no network call at runtime. Projects are stored in
`localStorage`, with automatic pruning if the quota is reached. Clearing site data clears
projects; use **Export → Download package** to keep anything you care about.

There is no "new product" dialog. The Product stage opens on a description field with a
placeholder and the four things a complete answer contains, and the compiler reads what you
write — the archetype, the name, the problem statement and the persona's segment all come from
your words. Rewriting it rebuilds the product and clears the ticks.

A tick is earned, not compiled. Artefacts can be complete while a stage is still open; each
stage ends with **Mark stage complete**, which stays disabled and lists what is missing until
the stage's own artefacts are there. The next stage's button stays locked until the one before
it is confirmed, and completed stages can be reopened.

That claim is executed, not asserted. `npm run walkthrough` renders the app in jsdom, never uses
a model and never asks a question, then walks Product → Data Shape → Design → Sections → Export,
confirming each stage the way a builder does and checking the package it lands on.
`npm run browser-check` types a description into the real production bundle and asserts the
product changes with it. `npm run example-app` treats the package as an app: it copies the
tokens, shell, sections and data shapes into a scratch Vite project and runs a real build. If
the handoff could not be compiled, that build fails.

---

## The reference site copy

`site/` holds a captured copy of the public site this workspace was modelled on — 155 files, 92
pages with real server-rendered content, served offline with absolute links rewritten to local
paths and no analytics. It is kept because the workspace is meant to be judged against a real
site's information architecture, tool pages and documentation, not against a mock.

| URL | What you get |
| --- | --- |
| `/` | the reference copy: home, tools, the tool pages, articles, sessions, pro |
| `/workspace/` | ProdOps itself — the five stages, the eight tools, the export |
| `/prodops-standalone.html` | the workspace as one file, no server |
| `/prodops-snapshot.html` | every workspace page as static markup, no JavaScript |

`npm run site-check` walks the copy: it counts the pages, reads every internal link and image,
and fails if a page is an empty shell or a link points at a file that was never captured. It
also operates the served copy the way a visitor does — opens the mobile drawer, submits the
newsletter form, opens a tool page — so "interactive" is a test result, not a claim.

21 URLs came back as a bot challenge and are replaced at serve time with a local notice that
says so and links back to the workspace. Teaser videos were never captured, so each player
becomes a labelled panel and its play button is marked unavailable instead of doing nothing.

---

## Why this exists

Product ideas do not fail for lack of code. They fail because the decisions behind the code were
never made: who it is for, what the data actually is, which colours and spacing are allowed, what
each screen has to do before it counts as done. An agent asked to invent all of that while
building will invent it inconsistently, and every later change has to be negotiated twice.

ProdOps makes those decisions artefacts. The screens are then a demonstration of the spec, and
the spec is what you ship from.

## The three inputs

Every artefact is a pure function of three inputs, so the same inputs always produce a
byte-identical package.

1. **Seed** — a phrase, shown in the UI, that drives every random choice.
2. **Archetype** — one of twelve domain packs (marketplace ops, clinical scheduling, dispatch,
   money ops, hiring, events and more), each with real entities, status machines, field
   definitions, requirements, risks and copy. Your description picks it, or you pick it.
3. **Genome** — density, motion, contrast and card style. Re-rolling one module never silently
   rewrites another.

`devzign.json` in the export carries the inputs, so a package can be regenerated and diffed.

## How the audit stays honest

Every claim in **Coverage** and **Export** is computed from the built package, at click time:
file counts, required paths, framework compilations, token contrast, test presence. If a row
could not be checked, it would not be a row.

---

## Architecture

```
src/engine/        the compiler: intake, archetypes, brief, data, design, screens, audit
src/export/        package generation: components, tokens, API, tests, docs, handoff
src/views/         one file per route
src/components/    the shell, the guide, the stage confirm, the registry previews
src/lib/           router, store, storage, progress, migrations
scripts/           the checks: render, export, walkthrough, qa, smoke, browser, site
```

The data layer is separated from the UI in the app and in the export. Tokens are W3C DTCG. Every
design is responsive by default, and every prototype input is a real input.

## What this is not

- **Not user research.** Personas and quotes are synthetic and labelled as such. The brief tells
  you to validate with three real interviews before locking a roadmap.
- **Not a benchmark.** Targets are directional design goals, not measured averages.
- **Not a replacement for taste.** It compiles a defensible starting system; choosing which parts
  to keep is still a human job.
- **Not an AI service.** No model is called, at build time or at run time. There are no keys and
  no accounts.

## Design principles of the compiler

1. **Determinism over novelty.** A design decision you cannot reproduce is not a decision.
2. **Artefacts must be checkable.** If a claim cannot be computed from the output, it does not
   belong in the audit.
3. **Module isolation.** Re-rolling one module must not silently rewrite another.
4. **Honest seams.** Synthetic personas, directional metrics and unimplemented components are
   labelled, not disguised.
5. **The handoff is the product.** The screens are a demonstration of the spec; the spec is what
   you ship from.

---

*ProdOps is designed and developed by **Lulamile Mkhungela**. Built as a working answer to a
simple question: what if the whole design phase required nothing from you but a description of
what you want built?*

*Some agent instructions and command files in the package are redistributed under the MIT
licence; their notices are in `src/export/licenses.ts` and ship at `docs/LICENSES.md`. Nothing
else in the product, its file names, its commands or its documentation comes from anywhere but
this repository.*
