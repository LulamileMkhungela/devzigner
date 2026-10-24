# The upstream audit

What this answers: *is everything from buildermethods.com and the buildermethods
repositories applied in Lula DevZign — including the API?*

Every row below was checked against a fresh clone, not against memory or a blog
post. **`/coverage` in the app and `npm run check` in this repo re-derive these
answers from the package on every run** — if a file disappears, a check fails.

| Repository | Language / size | Version reviewed | What it contributed |
| --- | --- | --- | --- |
| [`buildermethods/design-os`](https://github.com/buildermethods/design-os) | TypeScript, 70 KB | `main` | 10 commands, 8 docs (incl. `requirements.md`), the export contract, the UI skin |
| [`buildermethods/agent-os`](https://github.com/buildermethods/agent-os) | Shell, 411 KB | `main` — **v3.0.0** | 5 commands, `agent-os/` profile + standards, `config.yml` |
| [`buildermethods/agent-os`](https://github.com/buildermethods/agent-os/tree/v2) | Shell | branch `v2` | the 15 workflow files the workflows page documents |
| [`buildermethods/bm-skills`](https://github.com/buildermethods/bm-skills) | TypeScript, 202 KB | `main` | PRD Creator (12 steps), Skill Builder (6 + 2 refs), Design System (50 refs), Favicon Creator |
| [`buildermethods/agentcanon`](https://github.com/buildermethods/agentcanon) | HTML, 32 KB | `main` | `.agents/skills/` + `AGENTS.md` convention, `CLAUDE.md` symlink |
| [`buildermethods/build-new`](https://github.com/buildermethods/build-new) | TypeScript, 321 KB | `main` | the starter's `AGENTS.md`, `CLAUDE.md`, `docs/`, licence |

The organisation publishes exactly **five** repositories, all of them reviewed;
buildermethods.com adds nothing that is not in one of them.

## The two questions with surprising answers

**1. `requirements.md` is a Design OS file, not an Agent OS one.** It exists at
`design-os/docs/requirements.md` and nowhere in `agent-os`. The package ships it
twice: verbatim at `docs/design-os/requirements.md`, and rewritten for this
product at the top level as `requirements.md` (Node 22, React 18, Tailwind v4,
TypeScript 5.4, optional API, optional agent tooling).

**2. Agent OS v3 does not have workflows.** `main` is `3.0.0` — its changelog
entry `[3.0] - 2026-01-20` says it *"refocuses the framework on what it does
best — establishing and injecting standards — while deferring spec writing to
plan mode"*. The `/agent-os/workflows` documentation page is the **v2** page; its
files only exist on the `v2` branch. So the package installs v3 for real
(`agent-os/` with `config.yml`, `profiles/default/global/tech-stack.md`, the five
commands) and vendors the 15 v2 workflow files under `docs/agent-os-v2/`, with a
README that says plainly that v3 does not compile `{{workflows/...}}`
placeholders and that using them means installing the v2 profile.

Claiming the v2 compiler runs inside v3 would be false, so it is not claimed
anywhere in the UI, the README, or this file.

## Where each thing landed

| Upstream artefact | In the package | Verified by |
| --- | --- | --- |
| Design OS 10 commands | `.claude/commands/design-os/*.md`, byte-identical | `render-check`, `/coverage` |
| Design OS export contract | `product-plan/`, `instructions/`, `sections/`, `source/` | `render-check` (file by file), `npm run example-app` |
| Design OS docs | `docs/design-os/` (11 files incl. `requirements.md`, `LICENSE`) | `render-check`, `npm test` |
| Agent OS 5 commands | `.claude/commands/agent-os/*.md`, byte-identical | `render-check`, `/coverage` |
| Agent OS standards + specs | `agent-os/standards/`, `agent-os/specs/` (4 files per section) | `render-check` |
| Agent OS profile | `agent-os/config.yml`, `profiles/default/global/tech-stack.md` | `npm test` |
| Agent OS v2 workflows | `docs/agent-os-v2/workflows/**` (15) + `UPSTREAM-README.md` | `npm test` (count = 15) |
| bm-skills | `.agents/skills/{prd-creator,skill-builder,design-system,favicon-creator}/` + `docs/bm-skills/` | `/tools` parses the shipped `SKILL.md` |
| PRD Creator output | `_build_plan/prd.md`, `_build_plan/milestones/N-name/prompt.md`, `milestone-log.md` | `render-check` |
| agentcanon | `.agents/skills/`, `AGENTS.md`, `scripts/link-agents.sh`, `CLAUDE.md` symlink | `render-check` asserts `.claude/skills` holds no real skill |
| Build New | `template/build-new/` — `AGENTS.md`, `CLAUDE.md`, `docs/`, licences | `/coverage` |
| The site's free tools | all 8, on `/tools`, each with its own steps | `/coverage`, `/tools` |
| **The API** | `openapi.json`, `api/README.md`, `server/` (15 files incl. tests) | `npm test` parses the spec; `export-check` runs the server's suite |

## The API, specifically

The question *"including the API"* has two honest answers, because upstream
Design OS has no API at all — it is a design tool. The package therefore
generates one:

- `openapi.json` — OpenAPI **3.1**. Every entity gets `GET/POST /api/{entity}`,
  `GET/PATCH/DELETE /api/{entity}/{id}`, and `POST /api/{entity}/{id}/transition`
  where it has a status field. Schemas are derived from the compiled field types
  (enum, date, email, min/max), so the document cannot disagree with the server.
  Status journeys and role requirements ride along as `x-status-flows` and an
  `x-user-role` apiKey scheme.
- `api/README.md` — the same thing for a human: route table, roles, error codes,
  and the `npx openapi-typescript` line to get a typed client.
- `server/` — a dependency-free reference implementation on Node's `http`,
  with the rules, validation, services and event log the contract describes.

`/system` shows the route table live, and `/coverage` checks the spec parses, is
3.1, and covers every entity.

## What is deliberately not claimed

- **Build New** is a full Rails starter. The package carries its agent setup,
  conventions and licence, not the Rails application. That is marked *partial*
  on `/tools` and `/coverage` rather than glossed.
- **Agent OS v2 workflows are reference, not a running compiler.** See above.
- **The upstream site's marketing copy** is not reproduced; the tools' own steps
  and files are.
