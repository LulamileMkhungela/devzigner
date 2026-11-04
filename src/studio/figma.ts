/** Client-side handling for read-only Figma reference snapshots. */
import type { Reference, Role, StudioProject } from './model'
import { parseFigmaLink } from './figma-link'
export async function fetchFigmaReference(url: string, role: Role, step: string, token?: string): Promise<Reference> {
  const parsed = parseFigmaLink(url)
  if (!parsed) throw new Error('Paste a Figma frame link containing a node-id.')
  const response = await fetch('/api/figma-reference', { method:'POST', headers:{'Content-Type':'application/json', ...(token ? {'X-ProdOps-Figma-Token':token} : {})}, body:JSON.stringify({url:parsed.source}) })
  const result = await response.json() as { name?: unknown; text?: unknown; source?: unknown; error?: string }
  if (!response.ok || typeof result.name !== 'string' || typeof result.text !== 'string' || typeof result.source !== 'string' || result.text.length > 20000) throw new Error(result.error || 'Could not read this Figma frame.')
  const bytes = new TextEncoder().encode(result.text); let binary = ''; for (let i=0; i<bytes.length; i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192))
  return { id:crypto.randomUUID(), name:result.name.replace(/[\\/]/g,'-').slice(0,120), mime:'text/plain', data:btoa(binary), text:result.text, source:result.source, role, step }
}
export function addFigmaReference(project: StudioProject, reference: Reference): StudioProject {
  const remaining = project.references.filter(r => !(r.source === reference.source && r.role === reference.role && r.step === reference.step))
  if (remaining.length >= 12 || remaining.reduce((n,r)=>n+r.data.length,0) + reference.data.length > 3400000) throw new Error('The project reference limit was reached. Remove an old reference first.')
  return { ...project, references:[...remaining, reference], businessApproved:reference.role === 'business' ? false : project.businessApproved, designStale:reference.role === 'business' ? true : project.designStale, developmentStale:reference.role === 'business' || reference.role === 'design' ? true : project.developmentStale }
}
