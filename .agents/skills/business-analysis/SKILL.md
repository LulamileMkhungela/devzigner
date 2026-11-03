---
name: po-business-analysis
description: Run the full business analysis process for a product — vision and outcome, stakeholders and scope, current state, requirements elicitation, analysis and prioritisation, and validation with a written handoff. Use when a product idea needs to become an agreed, validated set of requirements before design or engineering starts. Not for database design or UI design — those are other roles.
user_invocable: true
---

# Business Analysis

You are guiding a business analysis practitioner through the full process, in order, one step at a time. Each step ends in a review with exactly three actions: **approve**, **reject**, or **proceed but flag for revisit**. Lock a step (approve it) before moving to the next; never skip ahead — earlier steps produce the inputs later steps depend on.

Every step asks its clarifying questions before it can be signed off, and every step writes a document into the project’s spec folder (`spec/<role>/`). Ask one decision at a time, propose a sensible default with the reasoning behind it, and let the builder edit the proposal rather than invent from nothing.

## Step 1 — Vision & outcome

Establish what the product is, who it is for, and what success looks like. Propose a 1–3 sentence vision plus 2–4 measurable outcomes and confirm both. Ask: what changes for the person you are building this for, and what number proves it worked? Produces: the brief summary, the elevator pitch, the success measures, the working name.

## Step 2 — Stakeholders & scope

Identify who the product serves, who signs it off, and what is explicitly out of scope. Propose personas with a goal, a pain and a quote that is actually true, plus a non-goals list. Ask: who signs this off, who will be annoyed by it, and what is deliberately out for release one? Produces: personas, decision makers, non-goals.

## Step 3 — Current state & problem

Describe the problem as it exists today, step by step, and what it costs. Propose at least two problem statements with costs, the as-is process, and the risks with their mitigations. Ask: how is this done today, and what does getting it wrong cost? Produces: the as-is process, problem statements, risks.

## Step 4 — Requirements elicitation

Elicit every requirement the product must meet, organised by section, each prioritised must / should / could. Walk the sections one at a time and ask which requirement would be cut if the budget halved, and which rule the system must never break. Produces: section specs with prioritised requirements.

## Step 5 — Analysis & prioritisation

Turn the requirements into a roadmap: what ships first, what it costs, what makes the product different, and the release gate. Ask what has to be true before the first release can ship, and what a competitor could not copy in a month. Produces: roadmap phases, differentiators, scope decisions.

## Step 6 — Validation & handoff

Check the analysis holds together, name the riskiest assumption, save the documents into the spec folder, and write the handoff for the role that picks it up next. Ask which assumption would sink this if it were wrong, and who picks this up next. Produces: the wiki, the saved spec folder, a passing audit, the handoff brief.

## Handoff

When every step is approved, save the documents, name the riskiest assumption that remains, and write the handoff for the role that picks the work up next. A handoff is written for a named reader, not for the file system.
