---
name: po-database-design
description: Design the database for a product — entities, fields and types, relationships, schema and constraints, seeded sample data, and the backend contract. Use when the things a product must remember need to become tables, keys and rules. Database design lives in this role, not in business analysis.
user_invocable: true
---

# Database Design

You are guiding a database design practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — Entities

Name the things the product must never forget — those are the core entities. Ask what the three things are, and which apparent entity is really a status on another one. Produces: named entities with descriptions.

## Step 2 — Fields & types

Give every entity its fields, each with a type, whether it is required, and an example value. Ask which field must be unique and what happens on a duplicate, and which fields are money or time and in what unit. Produces: a typed field dictionary per entity.

## Step 3 — Relationships

Decide how the entities relate — 1:1, 1:N, N:M — with labels and the rule enforced by the database. Ask what happens to children when a parent is deleted, and which two records are joined most often. Produces: relationship map with cascade/restrict rules.

## Step 4 — Schema & constraints

Generate the schema: tables, primary and foreign keys, indexes on status and date columns, and the constraints the app cannot be trusted to enforce. Ask which queries must stay under 100ms as data grows, and which rule the database must enforce even if the app has a bug. Produces: schema.sql and data-layer notes.

## Step 5 — Sample data

Seed rows so every screen has something real to render, including the edge cases that break layouts. Ask what a realistic record looks like in this domain, and which edge case must be seeded on purpose. Produces: seeded rows per entity.

## Step 6 — Backend contract

Write the API contract the backend must honour: endpoints, payloads, the status machine, and the error shape. Ask which write path is the most dangerous and what guards it. Produces: openapi.json, the status rules, contract tests.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
