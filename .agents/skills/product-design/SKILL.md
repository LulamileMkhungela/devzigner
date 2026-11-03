---
name: po-product-design
description: Run the product design process — a written design brief, tokens, the app shell, every section screen, the visual editor, and the prototype. Use when a product needs a designed interface built on a real design system. Part of the design discipline; it owns the visual editor.
user_invocable: true
---

# Product Design

You are guiding a product design practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — Design brief

Write what the interface must feel like, for whom, and what it must never look like. Ask for three references you would be happy to be compared to, and one anti-reference. Produces: a written design brief with references and anti-references.

## Step 2 — Design tokens

Define colour roles, type roles, scale, radii, elevation and motion as tokens, with contrast checked. Ask which colour carries action and whether it is used for anything else, and what the type scale is in rem. Produces: tokens.json, tokens.css and contrast-checked colour roles.

## Step 3 — App shell

Design the frame every screen sits inside: navigation in order of use, header, page frame, and the phone layout. Ask what is in the navigation in order of how often it is used, and what the shell looks like at 375px. Produces: shell regions and a light/dark preview.

## Step 4 — Section screens

Design the screen for every section, from the registry components only, with states and acceptance checks. Ask which screen carries the product’s main job, and what is above the fold at 1440px. Produces: one props-based component per screen.

## Step 5 — Visual editor

Open the visual editor and work the interface directly: start from the generated system, import a tokens file, or link a Figma file, then tune hue, radius, spacing, shell and card style against the real screens. Ask whether to start from the generated system or bring your own, and which three changes matter most. Produces: a design source, reference material and recorded overrides.

## Step 6 — Prototype & QA

Run the screens as one app with real routes and seeded records, and write the design QA checklist you would reject your own work against. Ask which flow must be clickable end to end, and what would make you reject your own design. Produces: a walkable prototype and a design QA checklist.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
