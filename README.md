# Lula DevZign

**A deterministic design compiler.** One seed in, a complete product package out: brief, data model, design system, interactive screens, tests and an agent-ready handoff.

No API keys. No prompts. No blank page. Nothing to provide.

```
seed + archetype + genome  ──►  brief · roadmap · schema · tokens · 18 screens · audit · ZIP
```

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
| **Audit** | 22 checks across accessibility, system, coverage and handoff — contrast ratios are calculated from the actual hex values |
| **Handoff** | 20–22 files: markdown specs, `schema.sql`, `tokens.css`, `tailwind-theme.css`, `tokens.json`, per-section specs, tests, an implementation brief for a coding agent, `audit.md`, `devzign.json` |

Everything is text. Everything is diffable. The ZIP is typically under 120 KB.

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
npm run render-check   # server-renders every view against a compiled project
npm run qa             # compiles all 12 archetypes × 3 seeds, checks invariants
npm run check          # all three
```

There is no backend, no database and no network call at runtime. Projects are stored in `localStorage` (with automatic pruning if the quota is reached). Clearing site data clears projects; use **Export ZIP** to keep anything you care about.

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
  export/package.ts      # 20+ markdown/SQL/token files for handoff
  components/AppPreview  # renders a screen using the project's own tokens
  views/                 # brief, roadmap, data, design, sections, player, audit, handoff
  lib/                   # store (localStorage), hash router, formatting, zip download
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
- **Not affiliated with Builder Methods or Design OS.** The workflow is inspired by the design-first school of building with agents. The implementation is independent: no prompts, no agent runtime, no model dependency.

---

## Design principles of the compiler

1. **Determinism over novelty.** A design decision you cannot reproduce is not a decision.
2. **Artefacts must be checkable.** If a claim cannot be computed from the output, it does not belong in the audit.
3. **Module isolation.** Re-rolling one module must not silently rewrite another.
4. **Honest seams.** Synthetic personas, directional metrics and unimplemented components are labelled, not disguised.
5. **The handoff is the product.** The screens are a demonstration of the spec; the spec is what you ship from.

---

*Built as a working answer to a simple question: what if the design phase required nothing from you but a seed?*
