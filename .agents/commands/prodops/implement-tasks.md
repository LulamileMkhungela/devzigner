# Implement Tasks

Work through `tasks.md` with the main agent, one task at a time, checking each off only when its acceptance holds.

Use this command for smaller features, or when you want direct control over execution. For a large feature with specialised work, use `/orchestrate-tasks` instead — not both for the same spec.

## Guidelines

- **One task at a time.** Implement, verify, tick, move on. Never batch three tasks and hope.
- **Read the standards first.** `standards/standards/index.yml` is the index; read the standards the task touches, and follow them rather than inventing a local style.
- **Reuse before you write.** The spec's *Reusable components* section names what already exists. Extend it; do not duplicate it.
- **Run the tests the task names.** A task is not done because the code looks right. It is done when the check in its acceptance line has actually run.
- **Do not edit the spec to match the code.** If the code cannot meet the spec, stop and say which requirement is blocked and why.
- **Keep the diff legible.** No drive-by refactors in a task that did not ask for them.

## Process

### 1. Read the spec and the tasks

Read `spec.md` and `tasks.md` in full before writing anything. If either is missing, stop and name the command that produces it.

### 2. Load the standards

Read `standards/standards/index.yml`, then the standards relevant to the first task group. Say which ones you are following.

### 3. Implement the task

Make the smallest change that satisfies the task's acceptance line. If it needs a pattern that does not exist yet, add it once and use it everywhere the spec says.

### 4. Verify the task

Run the test, the typecheck or the click-through named in the acceptance. If it fails, fix it before moving on. Then tick the box in `tasks.md`:

```markdown
- [x] 7. Add the `deals` table and its model
```

### 5. Repeat

Continue through the groups in order. After each group, re-read its tasks against the spec — an implementer who has been in the code for an hour is exactly the person who stops noticing scope creep.

### 6. Final verification

When every task is ticked, run the final verification:

1. **Task completion** — every box in `tasks.md` is checked.
2. **Tests passing** — the whole suite runs green, not just the new tests.
3. **Standards alignment** — check the diff against the standards you loaded.
4. **Roadmap** — update `standards/product/roadmap.md` to reflect what now exists.

Write the result to `agent-os/specs/{this-spec}/verification/final-verification.md`, with a line per check and the command you ran to prove it.

### 7. Report

Tell the user, briefly: what was built, what the verification found, and anything you deliberately left out. Building with agents is rarely one-and-done — ask them to review before shipping, and note any pattern worth turning into a standard.
