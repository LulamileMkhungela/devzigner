---
name: po-ui-design
description: Design the interface end to end — inventory the screens, define the layout and shell, specify every component state, check accessibility, and hand off a working prototype. Use when the UI needs to be designed against a real design system. Part of the design discipline.
user_invocable: true
---

# UI Design

You are guiding a ui design practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — Interface inventory

List every screen the product needs and what each is for, with its route. Ask which screen does the work the person came for, and which screen could be removed entirely. Produces: a screen inventory.

## Step 2 — Layout & grid

Define the frame, the grid, the shell regions and the navigation. Ask what stays on screen no matter where the person is, and where the layout breaks on a phone. Produces: shell regions, navigation, grid and spacing rules.

## Step 3 — Components & states

Specify the component set and every state each one can be in — empty, loading, error, success. Ask what it looks like with zero records and what it looks like when the request fails. Produces: the registry inventory and a states sheet.

## Step 4 — Accessibility

Check contrast per colour role, focus order, keyboard completion and labels. Ask whether the whole flow can be completed with a keyboard, and which text is below 4.5:1. Produces: contrast results and focus notes.

## Step 5 — Prototype & handoff

Run the screens as one app with real routes and seeded data, then write the contract engineering must not change. Ask which flow must work end to end, and what must engineering not change. Produces: a walkable prototype and a handoff spec.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
