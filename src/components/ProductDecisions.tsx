import type { Project } from '../types'
import { useStore } from '../lib/store'

const fields = [
  { key: 'inScope', label: 'What must the first version do?', placeholder: 'For example: keep a list of contacts and track deals.' },
  { key: 'outOfScope', label: 'What can wait until later?', placeholder: 'For example: custom fields and email integrations.' },
  { key: 'information', label: 'What information should it remember?', placeholder: 'For example: contacts have names and email addresses; deals can have several contacts.' },
  { key: 'design', label: 'How should it look and feel?', placeholder: 'For example: simple, easy to read on a phone, with a sidebar.' },
  { key: 'standards', label: 'Are there existing rules to follow?', placeholder: 'For example: reuse our existing buttons and explain why a convention exists before changing it.' },
] as const
export function ProductDecisions({ project }: { project: Project }) {
  const { setDecisions } = useStore()
  return <section className="lz-card lz-decisions" aria-labelledby="decisions-title">
    <p className="lz-cmd-label">Your decisions</p><h2 id="decisions-title">Make the plan yours</h2>
    <p className="lz-hint">Write down what matters in your own words. These notes are saved and included in your download. Changing a note clears stage approvals. Notes do not automatically change suggested screens; review those separately.</p>
    <div className="lz-stack" style={{ marginTop: 16, gap: 14 }}>{fields.map(field => <label key={field.key} className="lz-decision-field"><b>{field.label}</b><textarea className="lz-input" rows={2} placeholder={field.placeholder} value={project.decisions?.[field.key] ?? ''} onChange={e => setDecisions({ ...project.decisions, [field.key]: e.target.value })}/></label>)}</div>
  </section>
}
