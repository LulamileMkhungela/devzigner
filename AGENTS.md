# ProdOps — agent instructions

ProdOps is a product-planning workspace: it turns an idea into a specified,
designed, exportable product without asking the builder for a model, a key or
an account. This file is the entry point for any agent working in this repo.

Credit: Product and build by Lulamile Mkhungela.

## Two contexts

1. **The ProdOps app** — `src/` (React 19, TypeScript, Vite). This is the tool
   the builder uses; its views are the five stages.
2. **A product being built** — the exported package (`product-plan/`,
   `sections/`, `shell/`, `standards/`, `server/`). Nothing in `src/` is part
   of a user's product, and a user's product is never written back into `src/`.

## The five stages, and the commands behind them

| Stage | Command | Writes |
| --- | --- | --- |
| Product | `/product-vision`, `/product-roadmap` | `product/product-overview.md`, `product-roadmap.md`, `_build_plan/prd.md` |
| Data Shape | `/data-shape` | `data-shape/data-shape.md`, `schema.sql` |
| Design | `/design-tokens`, `/design-shell` | `design-system/colors.json`, `typography.json`, `product/shell/spec.md` |
| Sections | `/shape-section`, `/sample-data`, `/design-screen`, `/screenshot-design` | `sections/<name>/shape.md`, `plan.md`, `references.md`, `standards.md`, `visuals/` |
| Export | `/export-product` | `product-plan/` — the whole handoff |

Commands live in `.agents/commands/prodops/`; skills in `.agents/skills/`.
Standards set-up (`/discover-standards`, `/index-standards`, `/inject-standards`,
`/plan-product`, `/shape-spec`) is in the same folder.

## Rules the app enforces, and so should you

- **No keys, no data, no model.** Everything here is local and deterministic.
- **A stage ticks only when it is confirmed**, never merely because its
  artefacts exist. Complete is not the same as done.
- **One decision at a time, with a proposed default and its reasoning.**
- **The brief is a *what* document.** No libraries, method names or retry
  strategies in it; those belong to the plan for each milestone.
- **Guidance, never a dead end.** After any rebuild, say what to do next.

## Commands

```bash
npm run dev           # the workspace on :5173
npm run preview:site  # the site capture on :5173
npm run check         # rendering, site, unit, export, walkthrough, smoke, build
npm run kit           # rewrite the toolkit files above
```
