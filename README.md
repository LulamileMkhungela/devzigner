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
npm run kit            # rewrite the installable toolkit: .agents/, standards/, AGENTS.md
```

## The docs, applied

Thirteen documents describe how a product gets planned, shaped and shipped. They live in
[`docs/`](docs/README.md), and each one is applied by a named surface rather than quoted:

| Command | Stage in the workspace | What it writes |
| --- | --- | --- |
| `/product-vision`, `/product-roadmap` | Product (`/`) | `product/product-overview.md`, `product-roadmap.md`, `_build_plan/prd.md` |
| `/data-shape` | Data Shape (`/data-shape`) | `data-shape/data-shape.md`, `schema.sql` |
| `/design-tokens`, `/design-shell` | Design (`/design`, `/shell`) | `design-system/{colors,typography}.json`, `product/shell/spec.md` |
| `/shape-section`, `/sample-data` | Section (`/sections/:id`) | `sections/<name>/{shape.md,plan.md}` |
| `/design-screen`, `/screenshot-design` | Section → screens | `sections/<name>/visuals/`, the rendered screens |
| `/export-product` | Export (`/export`) | `product-plan/` — the whole handoff |

`/coverage` in the workspace is the same table, checked against the package that actually exists;
`/wiki` explains the canon the eight tools share.

The commands themselves are in the repository, not only in that table: `npm run kit` writes
`.agents/skills/<tool>/`, `.agents/commands/prodops/`, `standards/`, `template/starter/`,
`AGENTS.md` and `scripts/link-agents.sh`. Every `cp -r prodops/…` line in the Installation
section of the eight tool pages names one of those paths, and `npm run site-check` fails if a
page promises a path this checkout does not have.

## The tools page

`/tools.html` keeps the captured page — the eight cards, in the site's own listing — and above
them a browser whose left panel is the captured documentation sidebar of the selected tool
(`Getting Started` → Overview, Installation, Learn to build, How it works; `The workflow` → 1 to
8; `Using the output`). The tabs across the top of the article swap the panel in place, the
panel's anchors are scoped so they never collide with the page underneath, and the sidebar marks
the section you are reading as you scroll.

Below that browser the page is exactly the capture: the same cards, the same words. Nothing was
taken away to make room for the tabs.

There is no backend, no database and no network call at runtime. Projects are stored in
`localStorage`, with automatic pruning if the quota is reached. Clearing site data clears
projects; use **Export → Download package** to keep anything you care about.

There is no "new product" dialog. The Product stage opens on a description field with a
placeholder and the four things a complete answer contains, and the compiler reads what you
write — the archetype, the name, the problem statement and the persona's segment all come from
your words. Rewriting it rebuilds the product and clears the ticks.

Rewriting the description is the one action that empties every tick, so it is the one action that
has to say where to start again: a receipt stays in the composer — *0 of 5 confirmed*, the stage
road with the next stage marked, and a **Confirm Product** button that goes there — and the toast
that confirms the rebuild carries the same button, so it can be acted on rather than read.

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

## The site at `/`

`site/` is a captured copy of the public site this workspace was modelled on: 147 files, 112 pages,
91 of them with real server-rendered content, served offline with absolute links rewritten to local paths and
no analytics. It is the evidence the information architecture was copied from something real rather
than invented for a demo, so it is edited only where it named the old brand: the wordmarks, the
author portrait, the social cards, the object-store images, the absolute canonicals and two crawler
artefacts were renamed in place, and every reference followed, so the mirror's own links still
resolve to real files. Everything else that makes the site *ProdOps's* rather than somebody else's
happens on the way out, in `scripts/lib/brand.ts`:

- the name, the byline, the handles and the social links are rewritten;
- the five products in the copy are renamed to ProdOps's eight tools;
- the two wordmarks are replaced with the ProdOps lockup, inlined as data URIs so the logo needs no
  request at all and still shows when a page is opened from disk;
- every page is re-titled, and pages whose title never carried a brand get one.

Nothing in the tree is named after the old brand any more, and no URL points at it: the wordmark and
portrait files were renamed inside the capture (`images/logos/prodops-wordmark.svg`,
`images/marks/prodops-mark.svg`) and the references followed, so the mirror's own links still resolve
to real files rather than depending on a redirect. Photograph slots get the square mark instead of a
wordmark, because a lockup is unreadable at 40px. `npm run site-check` fails if any served or
mirrored page still carries the old brand, the old host in *any* position — text, comment, canonical
or structured data — or the old product names, if a page is not titled ProdOps, if the byline is
missing, or if the logo needs a request to appear.

Attribution is not lost with the branding: the MIT notices for the work this builds on live in
`docs/LICENSES.md`, which is where a licence requires them — on the package, not on the storefront.

### The same orange, everywhere

The logo is drawn in the site's own two brand tokens — `#f0621a` on dark surfaces and `#ea580c` on
light ones — and the workspace's accent is those same two values, so the app and the site are one
product rather than two palettes that nearly match. `npm run site-check` fails if a mark is drawn in
any other orange.

### The header, and light and dark

The workspace used to be a badge floating over the corner of every page. It is now a nav action,
first in the header before **Log in**, where a destination belongs — and it travels into the mobile
drawer with the other links. Beside **Join Pro** is the theme switch: the capture already carried a
`.dark` token block and both wordmarks, so the switch is one class on `<html>`, resolved by a four-line
script in the head before the first paint (no white flash for a reader whose machine is dark, and no
flash of the wrong logo). The choice is remembered per browser; with no JavaScript the pages stay in
the light theme they were captured in. The workspace has the same switch in its own header, and its
light and dark themes are both real themes rather than one theme and an inversion.

### Contrast, measured

The brand orange is bright, and white on it is 3.3:1 — under AA at the sizes these
controls use. So the label on the brand is ink (`#141110`, 5.8:1 on `#f0621a` and 5.3:1 on
`#ea580c`), the Access Free fill runs as a narrow band so the colour can move without changing
how light the button is, and brand-coloured *text* on the light page is one step darker
(`#b9430a`, 5.2:1). `npm run site-check` computes those ratios rather than asserting them in a
comment.

### Rand, South African time, and how people actually pay

- **Prices are in rand.** The capture was priced in dollars — Pro at $299 a year, a five-seat team at
  $1,495, a workshop ticket at $50 — and every one of them is now shown as `R5 499`, `R27 499` and
  `R899`, including the price inside the structured data (rand, `ZAR`), because that is the number a
  search result would quote.
- **Session times are South African, and computed rather than shifted.** Every session read
  "2:00 PM ET"; each is now "21:00 SAST". Eastern Time is UTC−5 outside American daylight saving and
  UTC−4 inside it, and South Africa is UTC+2 all year, so 2:00 PM ET is 20:00 SAST in April and 21:00
  in November. `scripts/lib/sast.ts` computes the rule from the session's own date, and dates are
  written day-first (`3 November 2026`). Each session page says the zone once — *SAST, GMT+2, all
  year* — because SAST is two hours ahead of GMT, not equal to it, and a reader who thinks in GMT
  should know that before they plan an evening.
- **Booking the founder is paid the same way.** The contact page gained *Book a session*: send the
  note, the scope and amount come back in writing, then PayShap, instant EFT or an invoice, with the
  reference `BOOKING`. No price is printed for a booking — a talk and a three-day build do not cost
  the same, and a made-up number would be worse than a question.
- **Payment is PayShap, an instant EFT, or an invoice** — none of which charges a fee to the payer or
  the seller, and none of which needs a card. The captured checkout step was a hand-off to a card
  processor; the payment block replaces that step on all three checkout pages. The PayShap ID and the
  banking details live in one object — `MERCHANT` in `scripts/lib/payments.ts` — and while a field is
  empty the page offers to send that detail instead of inventing one.
- **The founder is in the sign-off as himself**: the block that carried a product mark now carries
  his photograph (`site/images/people/lulamile-mkhungela.png`), cropped to the face, with his name and
  `Founder, ProdOps` beside it. The workspace footer credits the same face.

| URL | What you get |
| --- | --- |
| `/` | the copy: home, tools, the tool pages, articles, sessions, pro |
| `/workspace/` | ProdOps itself — the five stages, the eight tools, the export |
| `/prodops-standalone.html` | the workspace as one file, no server |
| `/prodops-snapshot.html` | every workspace page as static markup, no JavaScript |

On `/tools.html` a browser sits above the captured listing: the tool page's own documentation sidebar
in the left column, and a tab strip with one panel in the right column. Each tab reads that
tool's real page into the panel without a page load, so comparing two tools costs one click instead
of two page loads. `npm run site-check` asserts both halves: eight tabs that swap the panel and the
original eight-row list still in the left column and still displayed.

Every tool page carries its Installation section: the three ways to install it, the commands, and
where the files ship. That section is written against this repository, because the live site keeps
its own instructions behind an email gate and the crawler only ever saw the gate — the captured page
has the form and none of the words behind it. "Access free" takes the reader to that section instead
of promising a download this copy cannot serve.

`npm run site-check` also counts the pages, reads every internal link and image, and operates the
served copy the way a visitor does — opens the mobile drawer, submits the newsletter form, opens a
tool page — so "interactive" is a test result, not a claim.

21 URLs came back as a bot challenge and are replaced at serve time with a local notice that says so
and links back to the workspace. Teaser videos were never captured, so each player becomes a
labelled panel and its play button is marked unavailable instead of doing nothing.

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

`prodops.json` in the export carries the inputs, so a package can be regenerated and diffed.

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
scripts/lib/       serve-time repairs: the clone adapter, its runtime, its branding
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
