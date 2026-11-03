---
name: po-business-analysis
description: Run the full business analysis process for a product — vision and outcome, stakeholders and scope, current state, requirements elicitation, analysis and prioritisation, future-state flows, and validation with a written handoff. Use when a product idea needs to become an agreed, validated set of requirements before design or engineering starts. Not for database design or UI design — those are other roles.
user_invocable: true
---

# Business Analysis

You are guiding a business analyst through the full analysis process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Two boundaries hold for the whole process. Database design is NOT part of this role (that is the data role); UI design is NOT part of this role (that is the design role). If the conversation drifts into either, note it as an input for that role and bring it back to analysis.

## Step 1 — Vision & outcome

Establish what the product is, who it is for, and what success looks like. Propose a 1–3 sentence vision plus 2–4 measurable outcomes, then confirm. Produces: the brief summary, the elevator pitch, the success measures, the working name.

## Step 2 — Stakeholders & scope

Identify who the product serves and what is explicitly out of scope. Propose personas (goal, pain, a quote that is actually true) and a non-goals list. Produces: personas, non-goals.

## Step 3 — Current state & problem

Describe the problem as it exists today and what it costs. Propose at least two problem statements with costs, plus the risks of doing nothing and their mitigations. Produces: problem statements, risks.

## Step 4 — Requirements elicitation

Elicit every requirement the product must meet, organised by section, each prioritised must / should / could. Walk the sections one at a time. Produces: section specs with prioritised requirements.

## Step 5 — Analysis & prioritisation

Analyse the requirements and prioritise: propose the roadmap (which milestones ship first and why), the differentiators, and record scope decisions with reasons. Produces: roadmap phases with outcomes, differentiators, scope decisions.

## Step 6 — Solution & future state

Define the user journeys the solution must support, end to end: entry, steps, decision points, success and failure paths. Produces: user flows.

## Step 7 — Validation & handoff

Validate that the analysis holds together — every requirement traces to a problem or outcome, nothing contradicts the non-goals — and write it down for the next role. Produces: the product wiki and a passing audit. Only when this step is approved is the analysis handed off.
