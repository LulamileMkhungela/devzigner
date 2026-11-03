---
name: po-database-design
description: Design the data layer of a product — entities, fields and types, relationships, schema and constraints, seeded sample data, and the backend contract — so an implementation agent gets a database shape it cannot invent wrong. Use when requirements are agreed and the product needs its data model designed. Not for requirements analysis or UI design.
user_invocable: true
---

# Database Design

You are guiding the design of a product's data layer, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step before moving on; later steps build on earlier ones.

Plain language for non-technical builders: a *data model* is the list of things the app needs to remember and how they relate.

## Step 1 — Entities

Decide the things the product has to remember (e.g. Order, Customer, Ticket). One entity per thing, named in plain language, with a one-line description. Produces: the entity list.

## Step 2 — Fields & types

For each entity, list every field with its type (text, number, money, date, status, email, relation…), whether it is required, and a realistic example value. Flag the field that identifies a record and any status field. Produces: typed fields per entity.

## Step 3 — Relationships

Define how entities relate — 1:1, 1:N, N:M — with a plain-language label for each, enforced by the database rather than the UI. Produces: the relationship list.

## Step 4 — Schema & constraints

Generate the schema from the model: tables, primary and foreign keys, indexes on every status and date column used in queues, and the data-layer rules (e.g. the status machine). Produces: schema.sql and the data-layer notes.

## Step 5 — Sample data

Seed realistic rows for every entity so screens render something real and tests have fixtures. Produces: seeded rows per entity.

## Step 6 — Backend contract

Fix the API the backend must honour: one endpoint set per entity, the status transitions allowed, and contract tests. Produces: openapi.json, status-machine rules, contract tests. Only when this step is approved is the data layer handed to engineering.
