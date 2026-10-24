import type { Entity, Requirement, Screen, Section } from '../types'
import type { Pack } from './packTypes'
import type { Rng } from './rng'
import { buildScreen } from './screens'

type Ctx = { entity: Entity; section: string; screen: string }

const REQ: Record<string, ((c: Ctx) => string)[]> = {
  collection: [
    (c) => `Filtering and sorting ${c.entity.plural.toLowerCase()} must be reflected in the URL so a view can be shared or bookmarked.`,
    (c) => `Bulk-select rows and apply one action without a page reload; the table stays interactive while the request is in flight.`,
    (c) => `Export the current view to CSV using the same columns and active filters, with the export logged against the user.`,
    (c) => `Remember the last used filter and column set per user, scoped to the ${c.section} workspace.`,
    (c) => `Row click opens the record; the back button restores scroll position and filters exactly.`,
  ],
  detail: [
    (c) => `Deep-link every ${c.entity.name.toLowerCase()} by id; a stale link must show a recoverable not-found state, not a blank page.`,
    (c) => `Related records load lazily in their own tab and never block the primary record from rendering.`,
    (c) => `Show a full change history for the record with actor, timestamp and a field-level diff.`,
    (c) => `Destructive actions on the record require typed confirmation and are reversible for 30 seconds.`,
  ],
  editor: [
    (c) => `Validate on blur and on submit; a failed request must preserve every typed value.`,
    (c) => `Support keyboard-only completion: tab order follows visual order and Cmd/Ctrl+Enter submits.`,
    (c) => `Block duplicate submissions with an idempotency key and disable the submit control while pending.`,
    (c) => `Autosave drafts locally every five seconds and offer recovery after an accidental close.`,
  ],
  board: [
    (c) => `Persist column order and card position per user; a move is optimistic and rolls back visibly on failure.`,
    (c) => `Every drag writes an audit entry with previous state, new state, actor and timestamp.`,
    (c) => `Support keyboard moves (pick up, move left/right, drop) so the board is not mouse-only.`,
    (c) => `Show a per-column count and total value so the board doubles as a summary.`,
  ],
  calendar: [
    (c) => `Render all dates in the workspace timezone and label the timezone explicitly at the edge cases (month boundaries).`,
    (c) => `Month and week views share state, and arrow keys navigate periods without losing the selected record.`,
    (c) => `Conflicting placements are flagged inline with a one-click resolution path.`,
  ],
  analytics: [
    (c) => `Every chart states its date window, its source entity and its refresh time.`,
    (c) => `Export the underlying numbers, not an image of the chart.`,
    (c) => `Charts must render a readable empty state when there is insufficient data, with the threshold stated.`,
  ],
  settings: [
    (c) => `Show a diff of pending changes before applying, and allow revert.`,
    (c) => `Restrict destructive settings to Owners and write every change to the audit log.`,
    (c) => `Integration credentials are write-only in the UI: never echo a stored secret back.`,
  ],
  onboarding: [
    (c) => `Progress is resumable per user and never blocks the workspace from being used.`,
    (c) => `The import step performs a dry run and reports rejected rows with reasons before commit.`,
    (c) => `Invites are idempotent; re-inviting an existing member shows their status instead of duplicating.`,
  ],
  overview: [
    (c) => `Each card links to the filtered view that produced its number, so a number is never a dead end.`,
    (c) => `The page must load its primary summary from a single request within 400ms on a warm cache.`,
    (c) => `Order blocks by urgency: exceptions first, aggregates second, trends last.`,
  ],
  inbox: [
    (c) => `Queue order is risk-based (deadline, severity, age) and shows the reason for each position.`,
    (c) => `Keyboard shortcuts: J/K to move, Enter to open, E to resolve; documented in a help sheet.`,
    (c) => `Resolving an item requires a resolution code so downstream reporting is meaningful.`,
  ],
  map: [
    (c) => `Cluster pins below street zoom; selecting a pin highlights the matching row in the list.`,
    (c) => `The map must degrade to a list-only view when tiles fail to load.`,
    (c) => `Never render precise addresses for records the viewer cannot access.`,
  ],
  profile: [
    (c) => `Profile surfaces relationship history, not just attributes.`,
    (c) => `Editing from the profile returns to the profile with changes applied, not to the list.`,
    (c) => `Sensitive fields respect the viewer's role and are masked, not hidden silently.`,
  ],
}

const TEST: Record<string, string[]> = {
  collection: [
    'Opening the collection shows the first page of records, newest first, with a visible total.',
    'Applying a status filter updates the URL and the row count together.',
    'Selecting three rows and running a bulk action issues exactly one request.',
    'Exporting with a filter active contains only the filtered rows.',
    'A user without the create permission sees no create action.',
  ],
  detail: [
    'Opening a record by direct URL renders the correct primary field.',
    'An unknown id shows a not-found state with a link back to the collection.',
    'Editing a field updates the history tab with the before and after values.',
    'Related records appear only after their tab is opened.',
  ],
  editor: [
    'Submitting an empty required field shows an inline error and keeps focus in the form.',
    'A failed save preserves all typed values and offers a retry.',
    'Submitting twice in quick succession creates exactly one record.',
    'Escape closes the form and prompts when there are unsaved changes.',
  ],
  board: [
    'Dragging a card between columns updates the column counts immediately.',
    'A failed move reverts the card to its original column with a visible message.',
    'The board is operable with the keyboard alone.',
  ],
  calendar: [
    'A record dated on the last day of the month appears in the correct cell.',
    'Changing the displayed month does not lose the selected record.',
    'Two records in the same slot are both reachable.',
  ],
  analytics: [
    'Each chart displays its window and source.',
    'With fewer than the stated minimum records, the empty state explains the threshold.',
    'Exporting a chart downloads the underlying rows as CSV.',
  ],
  settings: [
    'Changing the workspace name shows a diff and requires a save.',
    'A Viewer cannot see destructive settings.',
    'A stored integration secret is never returned in plain text.',
  ],
  onboarding: [
    'Refreshing mid-setup resumes at the same step.',
    'A CSV import with three bad rows reports them and imports the good rows.',
    'Inviting an existing member does not create a duplicate.',
  ],
  overview: [
    'The overview renders its headline numbers from one request.',
    'Clicking a stat navigates to the filtered collection that produced it.',
    'With no records, the overview shows the guided empty state rather than zeroes.',
  ],
  inbox: [
    'Queue items are ordered by risk and each shows its reason.',
    'Pressing J then K moves focus forward and back without using the mouse.',
    'Resolving an item requires a code and removes it from the queue.',
  ],
  map: [
    'Pins render for every record with a location.',
    'Selecting a pin highlights the matching list row.',
    'When tiles fail, the list view still works.',
  ],
  profile: [
    'The profile shows the record history in reverse chronological order.',
    'Editing from the profile returns to the profile with the new values.',
    'Masked fields are masked for lower roles.',
  ],
}

const JOB_TEMPLATES = [
  'See every {object} that needs a decision this morning',
  'Turn a {object} from logged to resolved without leaving one screen',
  'Explain any number to a colleague in one click',
  'Onboard a new teammate without a walkthrough',
]

export function compileSections(pack: Pack, entities: Entity[], rng: Rng, currency: string): Section[] {
  return pack.sections.map((def) => {
    const sectionEntities = def.entityIds.map((id) => entities.find((e) => e.id === id)).filter(Boolean) as Entity[]
    const primary = sectionEntities[0] ?? entities[0]

    const screens: Screen[] = def.screens.map((sd) =>
      buildScreen(sd.kind, sd.name, def.entityIds, entities, rng, def.name, currency),
    )

    const requirements: Requirement[] = []
    let n = 1
    for (const screen of screens) {
      const pool = REQ[screen.kind] ?? REQ.overview
      const chosen = rng.picks(pool, 2)
      for (const fn of chosen) {
        requirements.push({
          id: `${def.id.toUpperCase().slice(0, 4)}-${String(n++).padStart(2, '0')}`,
          text: fn({ entity: primary, section: def.name, screen: screen.name }),
          priority: n <= 3 ? 'must' : n <= 5 ? 'should' : 'could',
        })
      }
    }

    // Field-level requirements make the spec feel like it knows the data model
    const textFields = primary.fields.filter((f) => f.type === 'text' || f.type === 'email').slice(0, 2)
    for (const field of textFields) {
      requirements.push({
        id: `${def.id.toUpperCase().slice(0, 4)}-${String(n++).padStart(2, '0')}`,
        text: `${primary.name}.${field.name} is required and stored trimmed; uniqueness is enforced at the database level where it identifies a record.`,
        priority: 'must',
      })
    }
    if (primary.statusField) {
      const field = primary.fields.find((f) => f.name === primary.statusField)
      requirements.push({
        id: `${def.id.toUpperCase().slice(0, 4)}-${String(n++).padStart(2, '0')}`,
        text: `Status transitions are constrained to ${field?.options?.join(' → ') ?? 'the documented set'}; illegal transitions are rejected server-side, not hidden in the UI.`,
        priority: 'must',
      })
    }
    if (def.extraRequirements) {
      for (const extra of def.extraRequirements) {
        requirements.push({
          id: `${def.id.toUpperCase().slice(0, 4)}-${String(n++).padStart(2, '0')}`,
          text: extra,
          priority: 'should',
        })
      }
    }

    const tests = [
      ...new Set(screens.flatMap((s) => (TEST[s.kind] ?? TEST.overview).slice(0, 2))),
      `${def.name}: a user with the Viewer role can read but cannot mutate ${primary.plural.toLowerCase()}.`,
      `${def.name}: the section is reachable from the primary navigation and highlights when active.`,
    ]

    return {
      id: def.id,
      name: def.name,
      purpose: def.purpose,
      priority: def.priority,
      icon: def.icon,
      jobs: [
        ...(def.extraJobs ?? []),
        ...rng.picks(JOB_TEMPLATES, 2).map((j) => j.replace('{object}', rng.pick(pack.objects))),
      ].slice(0, 4),
      requirements,
      entityIds: def.entityIds,
      screens,
      tests,
      outOfScope: def.outOfScope ?? [],
    }
  })
}
