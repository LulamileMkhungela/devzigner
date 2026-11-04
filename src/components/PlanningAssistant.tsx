import { useEffect, useState } from 'react'
import type { Project } from '../types'
import { useStore } from '../lib/store'
import { Icon } from './Icons'

type Message = { role: 'user' | 'assistant'; content: string }
const starters: Record<string, string> = {
  product: 'Help me clarify my idea. Ask me one question at a time, starting with who it is for.',
  'data-shape': 'Help me understand what information this product needs and how it fits together.',
  design: 'Help me choose a consistent look and feel that works on mobile and desktop.',
  sections: 'Help me shape the features, what is in or out, and the main screens.',
  export: 'Help me decide what to build first and how to review and test each milestone.',
}
function loadMessages(projectId: string): Message[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(`prodops.assistant.${projectId}`) || '[]'); return Array.isArray(data) ? data.filter((m): m is Message => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-30) : [] } catch { return [] }
}
export function PlanningAssistant({ project, stage }: { project: Project; stage: string }) {
  const { setBrief, notify } = useStore()
  const [open, setOpen] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(project.id))
  const [input, setInput] = useState('')
  const [access, setAccess] = useState('')
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { try { localStorage.setItem(`prodops.assistant.${project.id}`, JSON.stringify(messages)) } catch { /* works for the current session */ } }, [messages, project.id])
  useEffect(() => {
    if (!open) return
    const abort = new AbortController()
    fetch('/api/assistant', { signal: abort.signal }).then(async r => { if (!r.ok) throw new Error(); return r.json() }).then(data => setConfigured(Boolean(data.configured))).catch(() => { if (!abort.signal.aborted) setConfigured(false) })
    return () => abort.abort()
  }, [open])
  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    if (trimmed.length > 4000) { setError('Please shorten your message to 4,000 characters or less.'); return }
    const next: Message[] = [...messages, { role: 'user' as const, content: trimmed }].slice(-29)
    setMessages(next); setInput(''); setError(''); setBusy(true)
    const context = [`Current step: ${stage}`, `Product description: ${project.idea || 'Not provided yet.'}`, `Suggested sections (not necessarily approved): ${project.sections.map(s => s.name).join(', ') || 'None yet.'}`, `Builder notes: ${JSON.stringify(project.decisions ?? {})}`].join('\n').slice(0, 12000)
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Prodops-Access': access }, body: JSON.stringify({ messages: next, context }) })
      const data = await response.json()
      if (!response.ok || typeof data.reply !== 'string') throw new Error(data.error || 'The assistant could not respond.')
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (e) { setMessages(messages); setInput(trimmed); setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.') } finally { setBusy(false) }
  }
  function applyDraft() {
    if (!draft || draft.trim().length < 24) { setError('Write at least a sentence before updating the description.'); return }
    if (project.idea && !window.confirm('This replaces your product description and rebuilds its suggestions. Your stage confirmations will be reset. Continue?')) return
    setBrief(draft.trim()); setDraft(null); notify('Description updated. Review the suggestions before continuing.'); setOpen(false)
  }
  return <div className="lz-assistant">
    {open && <section className="lz-assistant-panel" aria-label="Product planning assistant">
      <div className="lz-assistant-header"><div><strong>Planning assistant</strong><p>Think through your product, one step at a time.</p></div><button className="lz-btn small quiet" onClick={() => setOpen(false)} aria-label="Close assistant"><Icon name="X" size={16}/></button></div>
      <div className="lz-assistant-body">
        <p className="lz-assistant-privacy">Messages, your product description, decision notes and suggested section names are sent to the configured AI provider. Avoid sharing sensitive information.</p>
        {configured === false && <div className="lz-assistant-alert"><b>Assistant not connected</b><p>The person running ProdOps needs to configure an AI provider on the server. You can still use the rest of the workspace without it.</p></div>}
        {configured === null && <p className="lz-hint">Checking connection…</p>}
        {configured && <label className="lz-assistant-access">Assistant access password<input className="lz-input" type="password" autoComplete="off" value={access} onChange={e => setAccess(e.target.value)} placeholder="Set by your workspace administrator"/><span>Kept only for this session. This is not your AI provider key.</span></label>}
        {messages.length === 0 && configured && <div className="lz-assistant-welcome"><b>Not sure where to start?</b><p>I can ask questions, explain tradeoffs and help you make a plan. You decide what to keep.</p><button className="lz-btn small" onClick={() => void send(starters[stage] || starters.product)}>Help me with this step <Icon name="ArrowRight" size={13}/></button></div>}
        <div className="lz-assistant-messages" aria-live="polite">{messages.map((m, i) => <div className={`lz-assistant-message ${m.role}`} key={i}><b>{m.role === 'user' ? 'You' : 'Assistant'}</b><p>{m.content}</p>{m.role === 'assistant' && <button className="lz-assistant-link" onClick={() => { setDraft(m.content); setError('') }}>Use as description draft</button>}</div>)}{busy && <p className="lz-hint">Thinking…</p>}</div>
        {draft !== null && <div className="lz-assistant-draft"><label><b>Review your description</b><span> Edit this before applying. It will replace your current description.</span><textarea className="lz-input" rows={5} value={draft} onChange={e => setDraft(e.target.value)} /></label><div className="lz-row"><button className="lz-btn small primary" onClick={applyDraft}>Update description</button><button className="lz-btn small" onClick={() => setDraft(null)}>Cancel</button></div></div>}
        {error && <p className="lz-assistant-error" role="alert">{error}</p>}
      </div>
      <form className="lz-assistant-form" onSubmit={e => { e.preventDefault(); void send(input) }}><label className="sr-only" htmlFor="assistant-input">Your message</label><textarea id="assistant-input" className="lz-input" rows={2} maxLength={4000} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question or describe your idea…"/><div className="lz-between"><button type="button" className="lz-assistant-link" disabled={!messages.length || busy} onClick={() => { if (window.confirm('Clear this conversation?')) { setMessages([]); setDraft(null) } }}>Clear conversation</button><button className="lz-btn small primary" disabled={!configured || busy || !input.trim()}>{busy ? 'Thinking…' : 'Send'} <Icon name="ArrowRight" size={13}/></button></div></form>
    </section>}
    <button className="lz-assistant-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><Icon name={open ? 'X' : 'Sparkles'} size={16}/>{open ? 'Close' : 'Get help'}</button>
  </div>
}
