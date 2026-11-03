---
name: po-software-engineering
description: Run the engineering process from the handoff — architecture and the API contract, front end, back end, tests, and the review that ships a package. Use when an approved design needs to become working software.
user_invocable: true
---

# Software Engineering

You are guiding a software engineering practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — Architecture

Choose the stack, the module boundaries, and what is deliberately not built. Ask what the smallest architecture is that survives a year, and what you would have to rewrite if the data outgrew it. Produces: a stack decision with reasons and module boundaries.

## Step 2 — API contract

Write every endpoint, its payload, its error shape and the status transition rules. Ask which endpoint the whole app depends on, and how the client learns that something failed and why. Produces: openapi.json with the status rules.

## Step 3 — Front end

Implement the screens from the registry, tokens only, with routes and every state wired. Ask which component is doing too much, and where the UI assumes a network round trip. Produces: components per section and wired routes.

## Step 4 — Back end

Build the server, the rules that must live there, and the data layer behind the contract. Ask which rule must never live in the client, and what happens on a retry. Produces: the server, its routes and rules tests.

## Step 5 — Tests

Decide what is tested at which level, and what must never regress. Ask which behaviour you would be most embarrassed to break, and what is tested by hand forever. Produces: per-section test specs and the non-regression list.

## Step 6 — Review & package

Assemble the handoff package and the review checklist, and be honest about the remainder. Ask what a reviewer would need to check this in an hour, and what is deliberately left for a later milestone. Produces: the ZIP package and a review checklist.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
