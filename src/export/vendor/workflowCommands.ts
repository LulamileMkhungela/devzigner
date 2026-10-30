// The five v2 workflow commands, as the agent runs them.
//
// The standards family in `standardsCommands.ts` covers discovering, indexing
// and injecting standards, plus `/plan-product` and `/shape-spec`. These are the
// rest of the v2 loop — the part that turns a shaped idea into a specification,
// a task list, an implementation and a verification report:
//
//     /write-spec → /create-tasks → /implement-tasks or /orchestrate-tasks
//     /improve-skills (2.1+, when standards are compiled to Skills)
//
// They install to `.agents/commands/prodops/` beside the other fifteen, so a
// single folder holds the whole workflow. Only the header above each command is
// ProdOps'; the process is the upstream one.
//
// Source: the v2 workflow pages (write-spec, create-tasks, implement-tasks,
// orchestrate-tasks, skills), scraped 2026-10-30 and attributed in LICENSES.md.

export const WORKFLOW_COMMANDS: { name: string; content: string }[] = [
  {
    name: 'write-spec',
    content: `# Write Spec

Turn the requirements gathered by \`/shape-spec\` into one specification document the rest of the build reads from.

**Run this command in plan mode.** If you are not in plan mode, stop and ask the user to enter it before continuing.

## What this produces

One file, \`agent-os/specs/{YYYY-MM-DD-HHMM-feature-slug}/spec.md\`, containing:

- **User stories** — who asks for what, and why, in the user's words
- **Requirements** — the numbered, testable statements the stories imply
- **Reusable components** — existing code the implementation should reuse rather than reinvent
- **Technical approach** — how the feature fits the codebase as it is, not a greenfield plan
- **Visual references** — mockups, wireframes or screenshots the UI must match, with their paths
- **Scope boundaries** — what this spec explicitly does not cover

## Guidelines

- **Always use AskUserQuestion** when a decision is genuinely open. Never invent an answer to a question the codebase or the user can settle.
- **Read before writing.** Search the codebase for the patterns this feature should follow: routes, models, services, tests, components. Name the files you found in *Reusable components*.
- **One specification, one feature.** If the requirements split into two independent pieces of work, say so and propose splitting them rather than writing a spec that hides the seam.
- **No implementation detail beyond the approach.** Method names, retries and parsing strategy belong to the tasks, not the spec.
- **Verify the spec before hand-off.** Re-read \`spec.md\` against these six headings. If any one is empty or thin, fix it now — the task list is only as good as the spec.

## Process

### 1. Read the shaped requirements

Open the spec folder from \`/shape-spec\` and read \`shape.md\` (and \`references.md\` if it exists). If there is no shaped requirement in front of you, stop and tell the user to run \`/shape-spec\` first.

### 2. Search the codebase

Find the closest existing implementation of each part of this feature. Note:

- the files that already do something similar
- the standards those files follow (\`standards/standards/index.yml\` is the index)
- the tests that cover them, so the new work lands in the same harness

### 3. Draft the user stories

Write them from the user's side: "As a {role}, I want {capability}, so that {outcome}." Propose the set, then confirm it with AskUserQuestion before writing requirements.

### 4. Write the requirements

Number them. Each one has to be checkable by a test or by a person clicking through the app. Strike any requirement that is really an implementation instruction.

### 5. State the technical approach

Describe how the feature fits the existing code: which files change, which are added, which patterns it reuses. No code yet.

### 6. Attach the visual references

List every mockup, wireframe or screenshot with its path, and say which screen or state it governs. If the user has none, say so plainly rather than inventing one.

### 7. Close the scope

Write the out-of-scope list before the tasks exist. It is the cheapest place to stop scope from spreading.

### 8. Verify and hand off

Check \`spec.md\` against the six headings above. Then tell the user the next command is \`/create-tasks\`.
`,
  },
  {
    name: 'create-tasks',
    content: `# Create Tasks

Break the specification into an ordered task list, grouped by specialty and written to be checked off one at a time.

## What this produces

One file, \`agent-os/specs/{this-spec}/tasks.md\`, with:

- **Task groups** by specialty — database, API, UI, testing, and any the codebase already uses
- **Tasks** inside each group, numbered, each small enough to finish and verify in one sitting
- **Order** that respects dependencies: schema before API, API before UI, test beside the work it proves
- **Acceptance** per task — the check that says it is done

The default order is test-driven: write the failing test, make it pass, move on.

## Guidelines

- **Always use AskUserQuestion** when the grouping or the order is a real choice. Propose a default first, with the reason.
- **Small tasks.** If a task needs more than one sentence to describe its acceptance, split it.
- **Every task names its files.** A task that says "update the UI" is not a task; "add the empty state to \`app/views/deals/index.tsx\`" is.
- **Cover the spec, then check.** Walk \`spec.md\` requirement by requirement and confirm each one is answered by at least one task. Report any requirement without a task instead of silently dropping it.
- **No new scope.** Tasks are the spec's work, not an opportunity to add a nice-to-have. Anything extra goes in the out-of-scope list.

## Process

### 1. Read the spec

Read \`spec.md\` in full, including the scope boundaries and the reusable components. If it does not exist, stop and tell the user to run \`/write-spec\` first.

### 2. Propose the groups

Look at how the codebase is layered and propose the same groups it already uses. Present the groups with a one-line purpose each, and confirm.

### 3. Break down the work

Under each group, write the tasks in dependency order. Number them continuously across the file, so "task 14" means one thing everywhere.

For each task, write:

\`\`\`markdown
- [ ] 7. Add the \`deals\` table and its model
  - Files: \`db/migrate/*_create_deals.rb\`, \`app/models/deal.rb\`
  - Acceptance: a deal can be created, moved between stages and destroyed; model tests pass
\`\`\`

### 4. Check the coverage

Map every requirement in \`spec.md\` to at least one task. Show the mapping as a short table. If a requirement has no task, either add one or tell the user the spec over-asks.

### 5. Verify the list

Read the list as an implementer who has not seen the spec: is the order possible? Is any task too large? Is any acceptance check unverifiable? Fix those before handing off.

### 6. Hand off

Tell the user to run \`/implement-tasks\` for a straightforward build, or \`/orchestrate-tasks\` when the feature is large enough to want subagents and per-group standards.
`,
  },
  {
    name: 'implement-tasks',
    content: `# Implement Tasks

Work through \`tasks.md\` with the main agent, one task at a time, checking each off only when its acceptance holds.

Use this command for smaller features, or when you want direct control over execution. For a large feature with specialised work, use \`/orchestrate-tasks\` instead — not both for the same spec.

## Guidelines

- **One task at a time.** Implement, verify, tick, move on. Never batch three tasks and hope.
- **Read the standards first.** \`standards/standards/index.yml\` is the index; read the standards the task touches, and follow them rather than inventing a local style.
- **Reuse before you write.** The spec's *Reusable components* section names what already exists. Extend it; do not duplicate it.
- **Run the tests the task names.** A task is not done because the code looks right. It is done when the check in its acceptance line has actually run.
- **Do not edit the spec to match the code.** If the code cannot meet the spec, stop and say which requirement is blocked and why.
- **Keep the diff legible.** No drive-by refactors in a task that did not ask for them.

## Process

### 1. Read the spec and the tasks

Read \`spec.md\` and \`tasks.md\` in full before writing anything. If either is missing, stop and name the command that produces it.

### 2. Load the standards

Read \`standards/standards/index.yml\`, then the standards relevant to the first task group. Say which ones you are following.

### 3. Implement the task

Make the smallest change that satisfies the task's acceptance line. If it needs a pattern that does not exist yet, add it once and use it everywhere the spec says.

### 4. Verify the task

Run the test, the typecheck or the click-through named in the acceptance. If it fails, fix it before moving on. Then tick the box in \`tasks.md\`:

\`\`\`markdown
- [x] 7. Add the \`deals\` table and its model
\`\`\`

### 5. Repeat

Continue through the groups in order. After each group, re-read its tasks against the spec — an implementer who has been in the code for an hour is exactly the person who stops noticing scope creep.

### 6. Final verification

When every task is ticked, run the final verification:

1. **Task completion** — every box in \`tasks.md\` is checked.
2. **Tests passing** — the whole suite runs green, not just the new tests.
3. **Standards alignment** — check the diff against the standards you loaded.
4. **Roadmap** — update \`standards/product/roadmap.md\` to reflect what now exists.

Write the result to \`agent-os/specs/{this-spec}/verification/final-verification.md\`, with a line per check and the command you ran to prove it.

### 7. Report

Tell the user, briefly: what was built, what the verification found, and anything you deliberately left out. Building with agents is rarely one-and-done — ask them to review before shipping, and note any pattern worth turning into a standard.
`,
  },
  {
    name: 'orchestrate-tasks',
    content: `# Orchestrate Tasks

Delegate a large feature to specialised agents, with each task group assigned to the agent and the standards that fit it.

Use this command when the feature is big enough to want parallel or specialised work. Choose \`/implement-tasks\` **or** \`/orchestrate-tasks\` for a given spec — never both.

## What this produces

- \`agent-os/specs/{this-spec}/orchestration.yml\` — the roadmap: task groups, the agent assigned to each, and the standards that guide it
- The same tasks ticked in \`tasks.md\` as they land

## Guidelines

- **Always use AskUserQuestion** when assigning an agent is a real choice. Propose an assignment and the reason, then let the user redirect it.
- **Detect the groups, do not invent them.** The groups are the ones already in \`tasks.md\`.
- **One owner per group.** Two agents editing the same files is not orchestration, it is a merge conflict.
- **The standards follow the group.** A database group gets the database standards; the UI group gets the frontend ones. When Skills are enabled, the standards are compiled to Skills and the assignment names the Skill instead of the file.
- **The main agent still verifies.** Delegation is not abdication: the final verification runs once, over the whole diff.

## Process

### 1. Confirm the spec and the tasks exist

Read \`spec.md\` and \`tasks.md\`. If the tasks are not written, stop and send the user to \`/create-tasks\`.

### 2. Detect the task groups

List the groups from \`tasks.md\` with their task counts. Show the dependency order, and say which groups can run in parallel and which cannot.

### 3. Assign agents

For each group, propose:

- the specialised agent (or the main agent when no specialism is needed)
- the standards that guide it
- the files it owns, so two groups cannot collide

Present the assignment as a table and confirm it. Write the confirmed plan to \`orchestration.yml\`.

### 4. Run the groups in dependency order

Hand each group to its agent with the spec, the standards and its own slice of \`tasks.md\`. When a group returns, tick its tasks and run its acceptance checks before starting anything that depends on it.

### 5. Integrate

After the groups land, run the full suite once more. Conflicts, duplicate helpers and drifting patterns are the failure mode of parallel work — look for them deliberately.

### 6. Final verification

Run the same four checks as \`/implement-tasks\` — task completion, tests, standards alignment, roadmap — and write \`agent-os/specs/{this-spec}/verification/final-verification.md\`. Include which agent built which group, so the next run can learn from it.

### 7. Report

Tell the user what each agent produced, what the verification found, and which assignments were wrong. Then note the pattern worth keeping.
`,
  },
  {
    name: 'improve-skills',
    content: `# Improve Skills

Sharpen the descriptions of the Skills compiled from your standards, so the right one fires when it is relevant and the rest stay out of the way.

ProdOps 2.1+ compiles each standard into a Skill when \`standards_as_claude_code_skills: true\`. A Skill is chosen by its description, not by an explicit reference — so a vague description is a standard that silently never applies.

## What this produces

Rewritten frontmatter \`description\` lines in the generated Skills, each saying **what the standard covers** and **when to use it**, in the words a person would actually use when asking for the work.

## Guidelines

- **Always use AskUserQuestion** when two descriptions could reasonably be merged or split.
- **Trigger language, added deliberately.** The description is the only thing the model sees before the Skill loads. Put the when-to-use cues there, never in the body.
- **Specific beats broad.** "Use when editing Ruby service objects that call external APIs" fires correctly; "general backend best practices" does not.
- **Do not rewrite the standard.** Only the description changes; the content stays exactly as written.
- **Do not over-trigger.** A Skill that claims everything will be loaded for everything, which is the cost Skills exist to avoid.

## Process

### 1. Find the Skills

Read the generated Skills (by default \`{project}/.claude/skills/*/SKILL.md\`). List each one with its current description and the standard it came from.

### 2. Test the descriptions against real tasks

For each Skill, write down three tasks from this project that should load it and two that should not. Read the description against them and mark every miss.

### 3. Rewrite the misses

For each failing description, draft a new one: one sentence of what it covers, one of when to use it, with the trigger words drawn from the real tasks. Show the before and after, and confirm.

### 4. Check for collisions

Two Skills that both claim the same task is a coin toss. Where descriptions overlap, either narrow one or propose merging the standards behind them — and if merging, say so plainly rather than papering over it with wording.

### 5. Write and re-check

Write the descriptions back, re-read every Skill against its five tasks, and report which now fire correctly. Leave the bodies untouched.

### 6. Hand off

Tell the user which Skills changed, which tasks now load them, and that the improvement loop continues: the next real run is the next test.
`,
  },
]
