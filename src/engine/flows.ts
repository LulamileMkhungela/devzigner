import type { Brief, FlowStep, Screen, Section, UserFlow } from '../types'
import { hashString, makeRng } from './rng'

/**
 * User flows are derived from the compiled sections and screens, not invented
 * on top of them. Every step points at a real screen, so a flow can be walked
 * in the prototype and every screen is reachable from at least one flow.
 */

function allScreens(sections: Section[]): { section: Section; screen: Screen }[] {
  return sections.flatMap((section) => section.screens.map((screen) => ({ section, screen })))
}

function firstByKind(sections: Section[], kinds: Screen['kind'][]) {
  for (const kind of kinds) {
    for (const section of sections) {
      const screen = section.screens.find((s) => s.kind === kind)
      if (screen) return { section, screen }
    }
  }
  return undefined
}

function step(
  id: string,
  title: string,
  detail: string,
  kind: FlowStep['kind'],
  hit?: { section: Section; screen: Screen },
): FlowStep {
  return {
    id,
    title,
    detail,
    kind,
    sectionId: hit?.section.id,
    screenId: hit?.screen.id,
  }
}

export function compileFlows(sections: Section[], brief: Brief, seed: number): UserFlow[] {
  const rng = makeRng(hashString(`flows:${seed}`))
  const personaA = brief.personas[0]
  const personaB = brief.personas[1] ?? personaA
  const screens = allScreens(sections)
  const primary = sections[0]
  const entry = firstByKind(sections, ['onboarding', 'overview', 'collection']) ?? screens[0]
  const action = firstByKind(sections, ['editor', 'detail', 'collection']) ?? screens[0]
  const read = firstByKind(sections, ['board', 'collection', 'inbox']) ?? screens[1] ?? screens[0]
  const measure = firstByKind(sections, ['analytics', 'profile']) ?? screens[screens.length - 1]
  const admin = firstByKind(sections, ['settings', 'profile']) ?? screens[screens.length - 1]
  const inbox = firstByKind(sections, ['inbox', 'calendar']) ?? screens[Math.min(2, screens.length - 1)]

  const entitiesOf = (...hits: ({ screen: Screen } | undefined)[]) =>
    Array.from(new Set(hits.flatMap((h) => h?.screen.entityIds ?? []))).slice(0, 4)

  const flows: UserFlow[] = [
    {
      id: 'flow-first-value',
      name: 'First run to first value',
      persona: personaA?.name ?? 'Primary user',
      goal: personaA?.goal ?? `Get something real done in ${primary?.name ?? 'the product'}`,
      trigger: 'A new account lands with no records of its own.',
      steps: [
        step('fv-1', `Land on ${entry.screen.name}`, entry.screen.intent, 'entry', entry),
        step(
          'fv-2',
          `Start the primary job`,
          `The clearest “do the thing” affordance leads into ${action.section.name}.`,
          'step',
          action,
        ),
        step(
          'fv-3',
          'Choose an example or start blank',
          'Pre-filled sample data makes the first screen legible without onboarding copy.',
          'decision',
          read,
        ),
        step('fv-4', `See the result on ${measure.screen.name}`, measure.screen.intent, 'exit', measure),
      ],
      entities: entitiesOf(entry, action, read),
      success: `The first real record exists and ${measure.screen.name} reflects it.`,
      failure: 'Empty tables with no example path back into creation.',
    },
    {
      id: 'flow-core-loop',
      name: 'Daily core loop',
      persona: personaB?.name ?? personaA?.name ?? 'Primary user',
      goal: personaB?.goal ?? primary?.purpose ?? 'Move work forward',
      trigger: 'A shift starts and the queue is already busy.',
      steps: [
        step('cl-1', `Scan ${read.screen.name}`, read.screen.intent, 'entry', read),
        step('cl-2', `Open a record`, `Detail arrives in a drawer so the queue keeps its place.`, 'step', action),
        step('cl-3', `Change status in ${action.screen.name}`, 'One state change per action, with the consequence written next to it.', 'step', action),
        step('cl-4', `Check ${measure.screen.name}`, 'The loop closes on evidence, not on a success toast.', 'exit', measure),
      ],
      entities: entitiesOf(read, action, measure),
      success: `${read.screen.name} is shorter at the end of the shift than at the start.`,
      failure: 'A record is edited twice because the first change gave no feedback.',
    },
    {
      id: 'flow-exception',
      name: 'Exception and recovery',
      persona: personaB?.name ?? personaA?.name ?? 'Ops lead',
      goal: 'Find what is stuck before a customer does.',
      trigger: 'A status stops moving for longer than its own threshold.',
      steps: [
        step('ex-1', `Open ${inbox.screen.name}`, inbox.screen.intent, 'entry', inbox),
        step('ex-2', 'Filter to the exception', 'Status filters are saved views, not ad-hoc typing.', 'step', inbox),
        step('ex-3', 'Decide: retry, escalate or close', 'Each branch is a real state with an owner.', 'decision', action),
        step('ex-4', `Confirm on ${read.screen.name}`, 'The record leaves the exception view only when the state actually changed.', 'exit', read),
      ],
      entities: entitiesOf(inbox, action, read),
      success: 'The exception queue reaches zero without a second ticket.',
      failure: 'An item can be marked resolved without its upstream state changing.',
    },
    {
      id: 'flow-admin',
      name: 'Set up the workspace',
      persona: personaB?.name ?? 'Workspace owner',
      goal: 'Make the product fit this team before inviting anyone.',
      trigger: 'Trial started, no integrations connected.',
      steps: [
        step('ad-1', `Open ${admin.screen.name}`, admin.screen.intent, 'entry', admin),
        step('ad-2', `Define the fields this team actually uses`, 'Custom fields are data, not code.', 'step', admin),
        step('ad-3', `Connect ${brief.integrations[rng.int(0, Math.max(0, brief.integrations.length - 1))] ?? 'the first integration'}`, 'Integrations are scoped to one job each.', 'step', admin),
        step('ad-4', 'Invite the first operator', 'Roles are decided before the invite is sent.', 'exit', admin),
      ],
      entities: entitiesOf(admin),
      success: 'A teammate accepts the invite and lands on the same data.',
      failure: 'Settings save silently and the invite goes out with the wrong role.',
    },
  ]

  return flows
}
