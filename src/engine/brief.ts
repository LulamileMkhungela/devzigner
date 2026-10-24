import type { Brief, Persona } from '../types'
import type { Pack } from './packTypes'
import type { Rng } from './rng'

const RISK_TEMPLATES: { risk: string; mitigation: string }[] = [
  {
    risk: 'Data migration becomes the real launch blocker',
    mitigation: 'Ship an import dry-run that reports rejected rows before anyone commits to cut-over.',
  },
  {
    risk: 'The health score is trusted before it is understood',
    mitigation: 'Expose every input and weight in a drawer beside the score; never show the number alone.',
  },
  {
    risk: 'Teams keep their old spreadsheet alive in parallel',
    mitigation: 'Make export one click and make the in-product view strictly better than the sheet on day one.',
  },
  {
    risk: 'Scope creeps into adjacent workflows',
    mitigation: 'Hold the non-goals line in review; any addition must remove something from the roadmap.',
  },
  {
    risk: 'Notification fatigue kills adoption in week two',
    mitigation: 'Default to a single daily digest and require an explicit opt-in per alert type.',
  },
  {
    risk: 'Permissions are retrofitted late and break trust',
    mitigation: 'Model roles and record-level visibility in the first milestone, before the data grows.',
  },
  {
    risk: 'Reporting is built before the workflow is used',
    mitigation: 'Gate analytics behind two weeks of real usage; instrument events first.',
  },
  {
    risk: 'Mobile is treated as a smaller desktop',
    mitigation: 'Design the field or on-the-go flow first at 375px, then expand to the desktop surface.',
  },
]

const PRINCIPLE_POOL = [
  'Every screen answers one question first.',
  'Numbers must be traceable to a record or a rule.',
  'Exceptions get human attention; averages do not.',
  'Defaults should be good enough for a first-day user.',
  'Empty states teach, they do not apologise.',
  'One primary action per screen, always visible.',
  'Destructive actions require a typed confirmation, not a modal click.',
  'The system should be legible to someone who did not build it.',
]

const JOB_TEMPLATES = [
  'When a {object} needs attention, I want to see why it is flagged so I can decide in seconds.',
  'When the day starts, I want a ranked list of what matters so I do not rebuild context from scratch.',
  'When something changes, I want the record to update itself so the report stays true.',
  'When a {actor} asks for an update, I want to answer without leaving the record.',
  'When a deadline approaches, I want a warning before it becomes an incident.',
  'When I finish the work, I want it logged so the next person does not start from zero.',
]

const NONGOAL_EXTRAS = [
  'Native mobile apps in the first two quarters',
  'A public API beyond the internal integration layer',
  'White-label theming for resellers',
  'An AI assistant that writes the decisions for you',
]

function lowerFirst(text: string): string {
  // Keep acronyms (B2B, HR, MVP) and proper nouns intact; only sentence-start words drop case.
  const first = text.split(' ')[0]
  if (/^[A-Z0-9&]{2,}$/.test(first)) return text
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function compileBrief(pack: Pack, rng: Rng, name: string, idea: string): Brief {
  const personas: Persona[] = pack.personas.map((p) => ({
    ...p,
    quoteTruth: 'Illustrative persona, synthesised by the compiler. Validate with three real interviews before locking scope.',
  }))

  const jobs = [
    ...(pack.sections[0]?.extraJobs ?? []),
    ...rng.picks(JOB_TEMPLATES, 4).map((t) =>
      t.replace('{object}', rng.pick(pack.objects)).replace('{actor}', rng.pick(pack.actors)),
    ),
  ].slice(0, 6)

  const differentiators = pack.differentiators.slice(0, 3)
  const risks = rng.picks(RISK_TEMPLATES, 3).map((r) => ({
    risk: r.risk,
    mitigation: r.mitigation,
  }))
  risks.push({
    risk: `The ${lowerFirst(pack.label)} category is crowded above and below this price point`,
    mitigation: `Win on ${rng.pick(['operational depth', 'time-to-first-value', 'traceability of every number', 'a workflow nobody else models'])} rather than feature count.`,
  })

  const principles = [...pack.principles, ...rng.picks(PRINCIPLE_POOL, 2)]

  const elevator =
    `${name} is a ${pack.category.toLowerCase()} workspace. ${pack.blurb} ` +
    `It exists because of one expensive failure: ${lowerFirst(pack.problems[0].title)}. ` +
    `The cost is ${lowerFirst(pack.problems[0].cost)}.`

  return {
    name,
    category: pack.category,
    tagline: pack.taglines[rng.int(0, pack.taglines.length - 1)].replace('{object}', pack.objects[0]),
    summary:
      `${pack.blurb} ${name} keeps the work, the money and the exceptions in one traceable surface, ` +
      `so the answer to "what needs attention today" takes one screen instead of five tools.` +
      (idea.trim() ? ` Seed direction: ${idea.trim().slice(0, 180)}` : ''),
    elevator,
    problems: pack.problems,
    personas,
    jobs,
    metrics: pack.metrics,
    differentiators,
    risks,
    principles,
    voice: pack.voice,
    nonGoals: [...pack.nonGoals.slice(0, 3), ...rng.picks(NONGOAL_EXTRAS, 1)],
    integrations: rng.picks(pack.integrations, Math.min(5, pack.integrations.length)),
  }
}
