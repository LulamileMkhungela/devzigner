# The package audit

What this answers: *does the package really contain everything the workspace claims it does,
including the API and the tests?*

Every row below is checked against the package that the compiler builds, not against a plan.
**`/coverage` in the app and `npm run check` in this repo re-derive these answers on every run**
— if a file disappears, a check fails. Nothing here is asserted in prose.

## Where each thing lands

| What | In the package | Verified by |
| --- | --- | --- |
| The ten stage commands | `.agents/commands/prodops/*.md` | `render-check`, `/coverage` |
| The five standards commands | `.agents/commands/prodops/*.md` | `render-check`, `/coverage` |
| The export contract | `product-plan/`, `instructions/`, `sections/`, `source/` | `render-check` (file by file), `npm run example-app` |
| The guides | `docs/guides/` — process, commands, toolkit, standards, tokens, implementation, versioning | `npm test` (and every link in them is checked) |
| The licences | `docs/LICENSES.md` | `npm test` |
| Standards layer | `standards/{product,standards,specs}/`, `config.yml`, `profiles/default/global/tech-stack.md` | `render-check` |
| The four skills | `.agents/skills/{prd-creator,skill-builder,design-system,favicon-creator}/` | `/tools` parses the shipped `SKILL.md` |
| PRD Creator output | `_build_plan/prd.md`, `_build_plan/milestones/N-name/prompt.md`, `milestone-log.md` | `render-check` |
| Agents canon | `.agents/skills/`, `AGENTS.md`, `scripts/link-agents.sh`, `CLAUDE.md` symlink | `render-check` asserts `.claude/skills` holds no real skill |
| Starter | `template/starter/` — `AGENTS.md`, `.agents/setup`, README | `/coverage` |
| The eight tools | all eight, on `/tools`, each with its own steps and the file each step lives in | `/coverage`, `/tools`, `npm test` |
| **The API** | `openapi.json`, `api/README.md`, `server/` (with its own tests) | `npm test` parses the spec; `export-check` runs the server's suite |
| No third-party naming | every file except `docs/LICENSES.md` | `npm test` scans all 400-odd files for it |

## The API

The package generates one:

- `openapi.json` — OpenAPI **3.1**. Every entity gets `GET/POST /api/{entity}`,
  `GET/PATCH/DELETE /api/{entity}/{id}`, and `POST /api/{entity}/{id}/transition` where it has a
  status field. Schemas are derived from the compiled field types (enum, date, email, min/max),
  so the document cannot disagree with the server. Status journeys and role requirements ride
  along as `x-status-flows` and an `x-user-role` apiKey scheme.
- `api/README.md` — the same thing for a human: route table, roles, error codes, and the
  `npx openapi-typescript` line to get a typed client.
- `server/` — a dependency-free reference implementation on Node's `http`, with the rules,
  validation, services and event log the contract describes, and tests that run on Node's own
  runner.

`/system` shows the route table live, and `/coverage` checks the spec parses, is 3.1, and covers
every entity.

## The framework layer

One product, eight targets. The `UI runtime` decision on `/system` selects React, Vue 3, Svelte
5, Preact, Solid, Angular, Lit or plain web components, and `npm run export-check` proves it by
running `@vue/compiler-sfc` over every generated SFC, `svelte/compiler` over every generated
component, and `tsc` over the React renderer and the custom elements. Nothing is claimed without
a compiler having seen the file.

## What is deliberately not claimed

- **The starter is a template, not a running Rails app.** The package carries its agent setup,
  conventions and README, not the application.
- **The reference site copy is a copy.** It is served offline, with the pages that came back as
  a bot challenge replaced by an honest notice. It is not presented as the workspace.
- **Screenshots are SVG.** They are drawn deterministically from the compiled screen blocks and
  tokens, so they cannot go stale and need no headless browser.
