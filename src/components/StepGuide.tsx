/**
 * How to do this step.
 *
 * The workspace has no "create project" prompt: the starter product is compiled
 * before the page paints, so the five phases are always walkable. What a new
 * builder needs instead is the instruction that goes with each phase — the
 * Design OS command it corresponds to, and the four or five moves that make the
 * phase done. That is what this panel is, once per phase.
 */
import { useState } from 'react'
import { Icon } from './Icons'

export type GuidePhase = 'product' | 'data-shape' | 'design' | 'sections' | 'export'

interface Guide {
  kicker: string
  title: string
  intro: string
  command: string
  steps: { do: string; where: string }[]
  done: string
}

const GUIDES: Record<GuidePhase, Guide> = {
  product: {
    kicker: 'Phase 1 of 5',
    title: 'How to shape the product',
    intro:
      'Decide what is being built, for whom, and what is out of scope. Everything downstream — the data shape, the tokens, the screens — is derived from this page, so this is the only phase where you write prose.',
    command: '/design-os:product-vision → /design-os:product-roadmap',
    steps: [
      { do: 'Write the one-line idea, then the problem and the people who have it.', where: 'The brief above' },
      { do: 'Accept or rewrite the roadmap: four milestones, each with an outcome.', where: 'Roadmap card' },
      { do: 'Mark what is explicitly out of scope — it stops scope creeping into the sections.', where: 'Out of scope' },
      { do: 'Recompile when the brief changes; the seed keeps the rest stable.', where: 'Menu → Recompile product' },
    ],
    done: 'Every section on the roadmap has a name, an owner job and a measurable outcome.',
  },
  'data-shape': {
    kicker: 'Phase 2 of 5',
    title: 'How to shape the data',
    intro:
      'Screens are only as good as the records behind them. Define the entities, their fields and the relationships first; every table, form and detail view later composes these rows.',
    command: '/design-os:data-shape → /design-os:sample-data',
    steps: [
      { do: 'Check each entity: the six or so fields a real row needs, and nothing else.', where: 'Entities grid' },
      { do: 'Confirm the status field — the API refuses updates that skip a step.', where: 'Field list' },
      { do: 'Read the relationships, then the generated schema.', where: 'Relationships / Schema' },
      { do: 'Replace the seeded rows with your own only if you have them — the seeds exist so nothing is blank.', where: 'Sample data' },
    ],
    done: 'Every entity has an id, typed fields, seeded rows and a status journey where it needs one.',
  },
  design: {
    kicker: 'Phase 3 of 5',
    title: 'How to decide the design system',
    intro:
      'Tokens before screens. Colours, type, spacing and radii are compiled to a W3C DTCG file; the shell and every exported component read those tokens and nothing else.',
    command: '/design-os:design-tokens → /design-os:design-shell',
    steps: [
      { do: 'Pick the primary hue and radius; watch the contrast column while you do.', where: 'Token editor' },
      { do: 'Check the type scale and the four breakpoints.', where: 'Type / Scale' },
      { do: 'Name the shell regions and the navigation items.', where: 'Shell' },
      { do: 'Preview the shell at 30 / 60 / 100 %, then in dark.', where: 'View shell design' },
    ],
    done: 'Every colour pair you ship clears 4.5:1, and the shell has the routes the sections need.',
  },
  sections: {
    kicker: 'Phase 4 of 5',
    title: 'How to build the sections',
    intro:
      'One section at a time, four steps each: spec, sample data, screen designs, screenshots. A section is done when all four are ticked — not when the screen looks right.',
    command: '/design-os:shape-section → /design-os:design-screen → /design-os:screenshot-design',
    steps: [
      { do: 'Write the spec: what it does, the acceptance criteria, what is out of scope.', where: 'Section → Spec' },
      { do: 'Bind the entities the section reads.', where: 'Section → Sample data' },
      { do: 'Design each screen from registry components only — real inputs, not pictures.', where: 'Section → Screen designs' },
      { do: 'Capture a screenshot per screen; the export will not ship an uncaptured screen.', where: 'Section → Screenshots' },
    ],
    done: 'Every section shows a full progress row; nothing is left at "spec only".',
  },
  export: {
    kicker: 'Phase 5 of 5',
    title: 'How to hand it over',
    intro:
      'The export is a folder, not a PDF: components, tokens, data shapes, the API, its tests and the agent tooling. Hand it to a builder or an agent and it builds the app in the order the instructions give.',
    command: '/design-os:export-product',
    steps: [
      { do: 'Clear the readiness checklist — it names the phase that is short.', where: 'Checklist' },
      { do: 'Choose Option A (incremental, shell then sections) or Option B (one-shot).', where: 'How to use this' },
      { do: 'Download the .zip and open README.md first, then instructions/.', where: 'Package card' },
      { do: 'Commit the folder to a repo; every further exploration gets a worktree.', where: 'git-workflow.md' },
    ],
    done: 'The package builds: `npm i && npm run dev` in the exported folder shows the same product.',
  },
}

export function StepGuide({ phase, defaultOpen = true }: { phase: GuidePhase; defaultOpen?: boolean }) {
  const guide = GUIDES[phase]
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="lz-card lz-guide" aria-label={`How to do phase: ${guide.title}`}>
      <button className="lz-guide-h" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="lz-guide-kicker">{guide.kicker}</span>
        <span className="lz-guide-title">{guide.title}</span>
        <span className="lz-guide-cmd mono">{guide.command}</span>
        <span className={`lz-caret${open ? ' is-open' : ''}`}>
          <Icon name="ChevronRight" size={14} />
        </span>
      </button>

      {open && (
        <div className="lz-guide-body">
          <p className="lz-guide-intro">{guide.intro}</p>
          <ol className="lz-guide-steps">
            {guide.steps.map((step, index) => (
              <li key={step.do}>
                <span className="lz-guide-n">{index + 1}</span>
                <span className="lz-guide-do">{step.do}</span>
                <span className="lz-guide-where">{step.where}</span>
              </li>
            ))}
          </ol>
          <p className="lz-guide-done">
            <Icon name="Check" size={12} strokeWidth={3} /> Done when: {guide.done}
          </p>
        </div>
      )}
    </section>
  )
}
