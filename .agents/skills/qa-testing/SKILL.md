---
name: po-qa-testing
description: Run verification for a release — a test plan, test cases, a functional pass, a regression pass, and the sign-off with its evidence. Use when something is about to ship and needs proving, not asserting.
user_invocable: true
---

# QA & Testing

You are guiding a qa & testing practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — Test plan

Scope what is tested, at which levels, on which environments and data, and what is explicitly not. Ask what the riskiest part of this release is, and what will not be tested and who accepts that. Produces: a test plan and the environments it runs on.

## Step 2 — Test cases

Write the cases, their steps and the expected result that makes pass or fail objective, including boundaries and permissions. Ask what the exact expected result of the main flow is, and which boundary value is most likely to break. Produces: cases per section.

## Step 3 — Functional pass

Run every case against a real build and log the result, with reproduction steps for each defect and a severity. Ask which defects are open right now and how bad, and whether each can be reproduced from the notes. Produces: a results log and reproduction steps.

## Step 4 — Regression pass

Prove that what worked before still works, and list the automated checks that gate every merge. Ask what broke last time and whether it is covered now, and which automated checks must gate every merge. Produces: a regression checklist and coverage list.

## Step 5 — Release sign-off

Decide whether this release ships, on what evidence, and which known issues are being shipped deliberately. Ask whether you would ship this to your own team tomorrow, and which known issue you are accepting. Produces: a sign-off record and known issues.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
