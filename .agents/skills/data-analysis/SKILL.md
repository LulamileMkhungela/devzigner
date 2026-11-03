---
name: po-data-analysis
description: Run an analysis from the decision to the recommendation — the decision question, metrics and KPIs, sources and data quality, the analysis model, and the insight with its confidence. Use when a decision needs evidence from data.
user_invocable: true
---

# Data Analysis

You are guiding a data analysis practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — The decision question

Write the decision this analysis informs and what answer would change it. Ask what decision will change as a result, and what answer would make you do something different. Produces: a written decision question and the people who will act on it.

## Step 2 — Metrics & KPIs

Define the measures that answer the question, exactly, with baselines and targets. Ask how each metric is defined — what counts and what does not — and what the baseline is today. Produces: a metric tree with definitions, baselines and targets.

## Step 3 — Data sources & quality

Inventory where the numbers come from, which system is the record, how fresh the data is, and where it is missing or biased. Ask which source is the system of record and which is a copy, and where the data is known to be biased. Produces: a source inventory with known gaps.

## Step 4 — Analysis model

Document the joins, segments and cohorts that turn raw tables into an answer, and what a false positive would look like. Ask which segments must be compared and why those, and what a false positive would look like. Produces: the documented joins and segments.

## Step 5 — Insight & recommendation

State the answer in one sentence, its confidence, the recommendation that follows and who owns it. Ask what the single sentence to the decision maker is, and how confident you are and what would raise that confidence. Produces: the insight and an owned recommendation.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
