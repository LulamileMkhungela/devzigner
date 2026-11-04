import type { Project } from '../types'
import type { PackageFile } from './package'
const text = (value?: string) => value?.trim() || 'Not decided yet.'
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export function buildDecisionPlan(project: Project): PackageFile[] {
  const decisions = project.decisions ?? {}
  const sections = [ ['Product idea', project.idea], ['First version', decisions.inScope], ['Not in the first version', decisions.outOfScope], ['Information and relationships', decisions.information], ['Look and feel', decisions.design], ['Existing standards', decisions.standards] ] as const
  const markdown = `# ${project.name}: decisions\n\nThese are the builder’s notes. Other generated suggestions should be reviewed against them.\n\n` + sections.map(([label, value]) => `## ${label}\n\n${text(value)}\n`).join('\n')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(project.name)} plan</title><style>body{font:16px/1.7 system-ui;max-width:760px;margin:60px auto;padding:0 24px;color:#292d27}h1{font-size:36px}section{padding:10px 0;border-bottom:1px solid #ddd}p{white-space:pre-wrap}</style></head><body><small>PRODUCT PLAN · REVIEW AND UPDATE AS YOU BUILD</small><h1>${escape(project.name)}</h1>${sections.map(([label, value]) => `<section><h2>${escape(label)}</h2><p>${escape(text(value))}</p></section>`).join('')}<section><h2>Suggested build order</h2><ol>${project.sections.map(s => `<li>${escape(s.name)}</li>`).join('')}</ol><p>Review the order and dependencies before building.</p></section></body></html>`
  const files: PackageFile[] = [{ path: 'build-plan/decisions.md', content: markdown }, { path: 'build-plan/prd.html', content: html }]
  project.sections.forEach((section, index) => {
    const slug = section.id.replace(/[^a-z0-9-]/gi, '-') || 'section'
    const dir = `build-plan/milestones/${String(index + 1).padStart(2, '0')}-${slug}`
    files.push({ path: `${dir}/prompt.md`, content: `# Milestone ${index + 1}: ${section.name}\n\nRead build-plan/prd.html, build-plan/decisions.md, the section's spec and previous milestone logs. Ask clarifying questions and propose an implementation plan for approval before writing code. Work only on this milestone. Reuse the design system; implement responsive screens, test important success and failure paths and rerun regression tests. Explain how to review the result in a browser. Write a milestone log describing what changed, decisions, actual test results and remaining work. Wait for review before moving on.\n` })
    files.push({ path: `${dir}/log.md`, content: `# ${section.name}: milestone log\n\n_To be completed after implementation._\n\n## What is new\n\n## Decisions\n\n## Tests and results\n\n## Remaining work and handoff\n` })
  })
  return files
}
