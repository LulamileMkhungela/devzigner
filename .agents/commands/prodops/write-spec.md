# Write Spec

Turn the requirements gathered by `/shape-spec` into one specification document the rest of the build reads from.

**Run this command in plan mode.** If you are not in plan mode, stop and ask the user to enter it before continuing.

## What this produces

One file, `agent-os/specs/{YYYY-MM-DD-HHMM-feature-slug}/spec.md`, containing:

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
- **Verify the spec before hand-off.** Re-read `spec.md` against these six headings. If any one is empty or thin, fix it now — the task list is only as good as the spec.

## Process

### 1. Read the shaped requirements

Open the spec folder from `/shape-spec` and read `shape.md` (and `references.md` if it exists). If there is no shaped requirement in front of you, stop and tell the user to run `/shape-spec` first.

### 2. Search the codebase

Find the closest existing implementation of each part of this feature. Note:

- the files that already do something similar
- the standards those files follow (`standards/standards/index.yml` is the index)
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

Check `spec.md` against the six headings above. Then tell the user the next command is `/create-tasks`.
