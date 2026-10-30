# Orchestrate Tasks

Delegate a large feature to specialised agents, with each task group assigned to the agent and the standards that fit it.

Use this command when the feature is big enough to want parallel or specialised work. Choose `/implement-tasks` **or** `/orchestrate-tasks` for a given spec — never both.

## What this produces

- `agent-os/specs/{this-spec}/orchestration.yml` — the roadmap: task groups, the agent assigned to each, and the standards that guide it
- The same tasks ticked in `tasks.md` as they land

## Guidelines

- **Always use AskUserQuestion** when assigning an agent is a real choice. Propose an assignment and the reason, then let the user redirect it.
- **Detect the groups, do not invent them.** The groups are the ones already in `tasks.md`.
- **One owner per group.** Two agents editing the same files is not orchestration, it is a merge conflict.
- **The standards follow the group.** A database group gets the database standards; the UI group gets the frontend ones. When Skills are enabled, the standards are compiled to Skills and the assignment names the Skill instead of the file.
- **The main agent still verifies.** Delegation is not abdication: the final verification runs once, over the whole diff.

## Process

### 1. Confirm the spec and the tasks exist

Read `spec.md` and `tasks.md`. If the tasks are not written, stop and send the user to `/create-tasks`.

### 2. Detect the task groups

List the groups from `tasks.md` with their task counts. Show the dependency order, and say which groups can run in parallel and which cannot.

### 3. Assign agents

For each group, propose:

- the specialised agent (or the main agent when no specialism is needed)
- the standards that guide it
- the files it owns, so two groups cannot collide

Present the assignment as a table and confirm it. Write the confirmed plan to `orchestration.yml`.

### 4. Run the groups in dependency order

Hand each group to its agent with the spec, the standards and its own slice of `tasks.md`. When a group returns, tick its tasks and run its acceptance checks before starting anything that depends on it.

### 5. Integrate

After the groups land, run the full suite once more. Conflicts, duplicate helpers and drifting patterns are the failure mode of parallel work — look for them deliberately.

### 6. Final verification

Run the same four checks as `/implement-tasks` — task completion, tests, standards alignment, roadmap — and write `agent-os/specs/{this-spec}/verification/final-verification.md`. Include which agent built which group, so the next run can learn from it.

### 7. Report

Tell the user what each agent produced, what the verification found, and which assignments were wrong. Then note the pattern worth keeping.
