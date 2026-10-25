/**
 * How to do this step.
 *
 * The workspace has no "create project" prompt: the starter product is compiled
 * before the page paints, so the five phases are always walkable. What a new
 * builder needs instead is the instruction that goes with each phase — the
 * ProdOps command it corresponds to, and the four or five moves that make the
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
    intro: 'Say what is being built and for whom. Everything downstream is derived from this page.',
    command: '/prodops:product-vision → /prodops:product-roadmap',
    steps: [
      { do: 'Describe the product, the problem and who has it.', where: 'The brief above' },
      { do: 'Accept or rewrite the roadmap: four milestones, each with an outcome.', where: 'Roadmap card' },
      { do: 'Mark what is out of scope.', where: 'Out of scope' },
      { do: 'Recompile after a rewrite.', where: 'Menu → Recompile product' },
    ],
    done: 'Every section on the roadmap has a name, an owner job and a measurable outcome.',
  },
  'data-shape': {
    kicker: 'Phase 2 of 5',
    title: 'How to shape the data',
    intro: 'Records before screens. Define the entities, their fields and how they relate.',
    command: '/prodops:data-shape → /prodops:sample-data',
    steps: [
      { do: 'Check each entity’s fields.', where: 'Entities grid' },
      { do: 'Confirm the status field.', where: 'Field list' },
      { do: 'Read the relationships, then the generated schema.', where: 'Relationships / Schema' },
      { do: 'Replace seeded rows only if you have your own.', where: 'Sample data' },
    ],
    done: 'Every entity has an id, typed fields, seeded rows and a status journey where it needs one.',
  },
  design: {
    kicker: 'Phase 3 of 5',
    title: 'How to decide the design system',
    intro: 'Tokens before screens. Colour, type, spacing and radii compile to one DTCG file.',
    command: '/prodops:design-tokens → /prodops:design-shell',
    steps: [
      { do: 'Pick the hue and radius; watch contrast.', where: 'Token editor' },
      { do: 'Check the type scale and the four breakpoints.', where: 'Type / Scale' },
      { do: 'Name the shell regions and the navigation items.', where: 'Shell' },
      { do: 'Preview the shell, light and dark.', where: 'View shell design' },
    ],
    done: 'Every colour pair you ship clears 4.5:1, and the shell has the routes the sections need.',
  },
  sections: {
    kicker: 'Phase 4 of 5',
    title: 'How to build the sections',
    intro: 'One section at a time: spec, data, screens, screenshots. All four, or it is not done.',
    command: '/prodops:shape-section → /prodops:design-screen → /prodops:screenshot-design',
    steps: [
      { do: 'Write the spec and its acceptance criteria.', where: 'Section → Spec' },
      { do: 'Bind the entities the section reads.', where: 'Section → Sample data' },
      { do: 'Design each screen from registry components.', where: 'Section → Screen designs' },
      { do: 'Capture a screenshot per screen.', where: 'Section → Screenshots' },
    ],
    done: 'Every section shows a full progress row; nothing is left at "spec only".',
  },
  export: {
    kicker: 'Phase 5 of 5',
    title: 'How to hand it over',
    intro: 'A folder, not a PDF: components, tokens, data shapes, the API, its tests and the agent files.',
    command: '/prodops:export-product',
    steps: [
      { do: 'Clear the readiness checklist.', where: 'Checklist' },
      { do: 'Choose incremental or one-shot.', where: 'How to use this' },
      { do: 'Download the .zip; read README.md first.', where: 'Package card' },
      { do: 'Commit it, then work in a branch.', where: 'git-workflow.md' },
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
