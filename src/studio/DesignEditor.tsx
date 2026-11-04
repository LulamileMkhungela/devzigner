/** Named design tokens and the optional link to a compatible application stylesheet. */
import { useEffect, useState } from 'react'
import { Palette, Upload } from 'lucide-react'
import { applyGenerated, type StudioProject } from './model'
import { defaultTokens as defaults, tokenCss, replaceTokenBlock, starterDesignFiles, type Tokens } from './tokens'

const hex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
function fromFile(project: StudioProject): Tokens {
  try {
    const value = JSON.parse(project.files.find(x => x.path === 'design/design-tokens.json')?.content || '{}')
    const colors = value.colors && typeof value.colors === 'object' && !Array.isArray(value.colors) ? Object.fromEntries(Object.entries(value.colors).filter(([name,v])=>/^[a-z][a-z0-9-]{0,39}$/.test(name) && !['primary','background','text'].includes(name) && hex(v)).slice(0,24)) as Record<string,string> : {}
    return { primary: hex(value.primary) ? value.primary : defaults.primary, background: hex(value.background) ? value.background : defaults.background, text: hex(value.text) ? value.text : defaults.text, radius: typeof value.radius === 'number' && value.radius >= 0 && value.radius <= 24 ? value.radius : defaults.radius, heading: typeof value.heading === 'string' ? value.heading.slice(0,70) : defaults.heading, button: typeof value.button === 'string' ? value.button.slice(0,30) : defaults.button, colors }
  } catch { return defaults }
}
function findColors(value: unknown, names: string[] = [], result: [string,string][] = []): [string,string][] {
  if (hex(value)) result.push([names.filter(n=>n !== '$value' && n !== 'value').join('-').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40), value])
  else if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key,child] of Object.entries(value)) findColors(child, [...names,key], result)
  return result
}
export function DesignEditor({ project, setProject }: { project: StudioProject; setProject: React.Dispatch<React.SetStateAction<StudioProject>> }) {
  const [tokens, setTokens] = useState(() => fromFile(project)); const [notice, setNotice] = useState(''); const [newName, setNewName] = useState('')
  const savedTokens = project.files.find(f => f.path === 'design/design-tokens.json')?.content
  useEffect(() => { setTokens(fromFile(project)) }, [savedTokens])
  async function importTokens(file: File) {
    if (file.size > 1000000) { setNotice('Use a JSON file under 1 MB.'); return }
    try {
      const all = findColors(JSON.parse(await file.text())).filter(([name])=>/^[a-z][a-z0-9-]{0,39}$/.test(name)); if (!all.length) throw new Error()
      const find = (terms: RegExp, fallback: string) => all.find(([name]) => terms.test(name))?.[1] ?? fallback
      const colors = Object.fromEntries(all.filter(([name])=>!['primary','background','text'].includes(name)).slice(0,24))
      setTokens(t => ({ ...t, primary: find(/primary|brand|accent/, t.primary), background: find(/background/, t.background), text: find(/text|foreground|ink/, t.text), colors })); setNotice('Named hex colors loaded for review. Save to use them; unsupported token formats were not imported.')
    } catch { setNotice('No supported named six-digit hex colors found in this JSON.') }
  }
  function persist(value: Tokens) {
    setProject(p => {
      let next = applyGenerated(p, 'design', [{ path:'design/design-tokens.json', content: JSON.stringify(value, null, 2) }, { path:'design/design-tokens.css', content: tokenCss(value) + '\n' }])
      const stylesheet = p.files.find(f => f.path === 'solution/styles.css')
      const updated = stylesheet && replaceTokenBlock(stylesheet.content, value)
      if (updated !== null && updated !== undefined) next = { ...applyGenerated(next, 'development', [{path: 'solution/styles.css', content: updated}]), developmentStale: true }
      return next
    })
  }
  function change(value: Tokens) { setTokens(value); persist(value) }
  function save() {
    const linked = project.files.some(f => f.path === 'solution/styles.css' && replaceTokenBlock(f.content, tokens) !== null)
    persist(tokens)
    setNotice(linked ? 'Saved and applied to the linked application stylesheet. Check contrast before use.' : 'Saved. Your application styles must use these CSS variables to reflect changes.')
  }
  function removeSystem() {
    if (!window.confirm('Remove the design token and component guide files? Existing application code will not be changed.')) return
    setProject(p => ({...p,files:p.files.filter(f=>!['design/design-tokens.json','design/design-tokens.css','design/components.md'].includes(f.path)),developmentStale:true}))
    setTokens({...defaults,colors:{}}); setNotice('Design system removed. Import your own tokens or restore the starter. Application code is unchanged.')
  }
  function addColor() {
    const name=newName.trim().toLowerCase()
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(name) || ['primary','background','text'].includes(name) || name in (tokens.colors ?? {})) { setNotice('Choose a unique name using letters, numbers and hyphens.'); return }
    if (Object.keys(tokens.colors ?? {}).length >= 24) { setNotice('Use up to 24 additional named colors.'); return }
    change({...tokens,colors:{...tokens.colors,[name]:'#808080'}}); setNewName(''); setNotice('Color added. Save to apply it.')
  }
  return <div className="visual-editor"><div className="visual-heading"><div><b><Palette size={16}/> Review design system &amp; tokens</b><p>Named colors and component guidance are a starting point. Import your own or remove the starter.</p></div><label className="reference-upload"><Upload size={14}/> Import tokens<input type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) void importTokens(f); e.target.value = '' }}/></label></div><div className="visual-grid"><div className="token-controls">{(['primary','background','text'] as const).map(key => <label key={key}>{key}<input aria-label={`${key} color`} type="color" value={tokens[key]} onChange={e => change({...tokens,[key]:e.target.value})}/><span>{tokens[key]}</span></label>)}{Object.entries(tokens.colors ?? {}).map(([name,color])=><label key={name}>{name}<input aria-label={`${name} color`} type="color" value={color} onChange={e=>change({...tokens,colors:{...tokens.colors,[name]:e.target.value}})}/><span>{color}</span><button className="remove-token" aria-label={`Remove ${name} color`} onClick={()=>{const colors={...tokens.colors};delete colors[name];change({...tokens,colors})}}>×</button></label>)}<div className="add-color"><input aria-label="New color name" placeholder="e.g. warning" value={newName} onChange={e=>setNewName(e.target.value)}/><button onClick={addColor}>Add color</button></div><label>Corner radius<input type="range" min="0" max="24" value={tokens.radius} onChange={e => change({...tokens,radius:Number(e.target.value)})}/><span>{tokens.radius}px</span></label></div><div className="visual-preview" style={{background:tokens.background,color:tokens.text,borderRadius:tokens.radius}}><small>COMPONENT PREVIEW</small><h4>{tokens.heading}</h4><p>Buttons, cards and status colors use named tokens.</p><span style={{background:tokens.primary,color:'#fff',borderRadius:tokens.radius}}>{tokens.button}</span><div className="token-swatches">{Object.entries(tokens.colors ?? {}).map(([name,color])=><div key={name}><i style={{background:color}}/>{name}</div>)}</div></div></div><div className="visual-foot"><p>Color and radius changes save automatically and update a linked token block in solution/styles.css. Other code must use the named variables; hard-coded colors do not change automatically. Review contrast.</p><div className="step-buttons"><button className="button outline small" onClick={save}>Save design tokens</button>{savedTokens && <button className="button outline small" onClick={removeSystem}>Remove design system</button>}{!savedTokens && <button className="button outline small" onClick={()=>{setProject(p=>applyGenerated(p,'design',starterDesignFiles()));setNotice('Starter design system restored.')}}>Restore starter</button>}</div></div>{notice && <p className="reference-status" role="status">{notice}</p>}</div>
}
