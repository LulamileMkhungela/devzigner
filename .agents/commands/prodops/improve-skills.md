# Improve Skills

Sharpen the descriptions of the Skills compiled from your standards, so the right one fires when it is relevant and the rest stay out of the way.

ProdOps 2.1+ compiles each standard into a Skill when `standards_as_claude_code_skills: true`. A Skill is chosen by its description, not by an explicit reference — so a vague description is a standard that silently never applies.

## What this produces

Rewritten frontmatter `description` lines in the generated Skills, each saying **what the standard covers** and **when to use it**, in the words a person would actually use when asking for the work.

## Guidelines

- **Always use AskUserQuestion** when two descriptions could reasonably be merged or split.
- **Trigger language, added deliberately.** The description is the only thing the model sees before the Skill loads. Put the when-to-use cues there, never in the body.
- **Specific beats broad.** "Use when editing Ruby service objects that call external APIs" fires correctly; "general backend best practices" does not.
- **Do not rewrite the standard.** Only the description changes; the content stays exactly as written.
- **Do not over-trigger.** A Skill that claims everything will be loaded for everything, which is the cost Skills exist to avoid.

## Process

### 1. Find the Skills

Read the generated Skills (by default `{project}/.claude/skills/*/SKILL.md`). List each one with its current description and the standard it came from.

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
