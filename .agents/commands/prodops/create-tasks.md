# Create Tasks

Break the specification into an ordered task list, grouped by specialty and written to be checked off one at a time.

## What this produces

One file, `agent-os/specs/{this-spec}/tasks.md`, with:

- **Task groups** by specialty — database, API, UI, testing, and any the codebase already uses
- **Tasks** inside each group, numbered, each small enough to finish and verify in one sitting
- **Order** that respects dependencies: schema before API, API before UI, test beside the work it proves
- **Acceptance** per task — the check that says it is done

The default order is test-driven: write the failing test, make it pass, move on.

## Guidelines

- **Always use AskUserQuestion** when the grouping or the order is a real choice. Propose a default first, with the reason.
- **Small tasks.** If a task needs more than one sentence to describe its acceptance, split it.
- **Every task names its files.** A task that says "update the UI" is not a task; "add the empty state to `app/views/deals/index.tsx`" is.
- **Cover the spec, then check.** Walk `spec.md` requirement by requirement and confirm each one is answered by at least one task. Report any requirement without a task instead of silently dropping it.
- **No new scope.** Tasks are the spec's work, not an opportunity to add a nice-to-have. Anything extra goes in the out-of-scope list.

## Process

### 1. Read the spec

Read `spec.md` in full, including the scope boundaries and the reusable components. If it does not exist, stop and tell the user to run `/write-spec` first.

### 2. Propose the groups

Look at how the codebase is layered and propose the same groups it already uses. Present the groups with a one-line purpose each, and confirm.

### 3. Break down the work

Under each group, write the tasks in dependency order. Number them continuously across the file, so "task 14" means one thing everywhere.

For each task, write:

```markdown
- [ ] 7. Add the `deals` table and its model
  - Files: `db/migrate/*_create_deals.rb`, `app/models/deal.rb`
  - Acceptance: a deal can be created, moved between stages and destroyed; model tests pass
```

### 4. Check the coverage

Map every requirement in `spec.md` to at least one task. Show the mapping as a short table. If a requirement has no task, either add one or tell the user the spec over-asks.

### 5. Verify the list

Read the list as an implementer who has not seen the spec: is the order possible? Is any task too large? Is any acceptance check unverifiable? Fix those before handing off.

### 6. Hand off

Tell the user to run `/implement-tasks` for a straightforward build, or `/orchestrate-tasks` when the feature is large enough to want subagents and per-group standards.
