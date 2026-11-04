import { useEffect, useState } from 'react'
import { ChevronDown, Link2, LockKeyhole } from 'lucide-react'
import { fetchFigmaReference } from './figma'

export interface ClaudeConnection { key:string; model:string }
export interface FigmaConnection { token:string; verified:boolean }
interface Props {
  claude:ClaudeConnection | null
  setClaude:React.Dispatch<React.SetStateAction<ClaudeConnection | null>>
  figma:FigmaConnection | null
  setFigma:React.Dispatch<React.SetStateAction<FigmaConnection | null>>
  serverConfigured:boolean | null
  serverProvider:string | null
}
const isKey = (value:string) => /^[\x21-\x7e]{8,512}$/.test(value)
const isModel = (value:string) => /^[a-zA-Z0-9._-]{1,100}$/.test(value)
function secureContext() {
  return (window.location.protocol === 'https:' && window.isSecureContext !== false) || (window.location.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname))
}

/** Credentials are deliberately held in component memory, never in project history or exports. */
export function Connections({claude,setClaude,figma,setFigma,serverConfigured,serverProvider}:Props) {
  const [claudeKey,setClaudeKey]=useState(''); const [model,setModel]=useState('claude-sonnet-4-6'); const [figmaKey,setFigmaKey]=useState(''); const [frame,setFrame]=useState('')
  const [claudeMessage,setClaudeMessage]=useState(''); const [figmaMessage,setFigmaMessage]=useState(''); const [testingClaude,setTestingClaude]=useState(false); const [testingFigma,setTestingFigma]=useState(false)
  const [figmaServer,setFigmaServer]=useState<boolean | null>(null)
  useEffect(()=>{ fetch('/api/figma-reference').then(r=>r.json()).then(data=>setFigmaServer(data.configured===true)).catch(()=>setFigmaServer(false)) },[])
  async function connectClaude() {
    const key=claudeKey.trim(), selectedModel=model.trim()
    if (!secureContext()) { setClaudeMessage('Use HTTPS or local development to enter a key.'); return }
    if (!isKey(key) || !isModel(selectedModel)) { setClaudeMessage('Enter a valid API key and model ID without spaces.'); return }
    setTestingClaude(true);setClaudeMessage('Checking Claude…')
    try {
      const response=await fetch('/api/studio',{method:'POST',headers:{'Content-Type':'application/json','X-ProdOps-Claude-Key':key,'X-ProdOps-Claude-Model':selectedModel},body:JSON.stringify({testConnection:true})})
      const result=await response.json() as {connected?:boolean;error?:string}
      if (!response.ok || result.connected!==true) throw new Error(result.error || 'Claude could not be verified.')
      setClaude({key,model:selectedModel});setClaudeKey('');setClaudeMessage('Claude connected for this tab. You can now create drafts.')
    } catch (error) {setClaudeMessage(error instanceof Error ? error.message : 'Could not connect to Claude.')}
    finally {setTestingClaude(false)}
  }
  function connectFigma() {
    const token=figmaKey.trim()
    if (!secureContext()) {setFigmaMessage('Use HTTPS or local development to enter a token.');return}
    if (!isKey(token)) {setFigmaMessage('Enter a valid token without spaces.');return}
    setFigma({token,verified:false});setFigmaKey('');setFigmaMessage('Token added for this tab. Test it with a frame link, or import a frame when you need it.')
  }
  async function testFigma() {
    if (!figma) return
    const token=figma.token;setTestingFigma(true);setFigmaMessage('Checking the frame…')
    try {await fetchFigmaReference(frame,'design','screens',token);setFigma(current=>current?.token===token?{...current,verified:true}:current);setFigmaMessage('Figma connected. The selected frame can be read; import it under Add a reference to use it in a project.')}
    catch(error){setFigma(current=>current?.token===token?{...current,verified:false}:current);setFigmaMessage(error instanceof Error ? error.message : 'Could not verify this frame.')}
    finally {setTestingFigma(false)}
  }
  return <details className="connections"><summary><span><Link2 size={17}/><b>Connect Claude &amp; Figma</b></span><small>{claude ? 'Claude connected' : serverConfigured ? 'AI available on server' : 'Add your own keys'} · {figma?.verified ? 'Figma connected' : figma ? 'Figma key added' : figmaServer ? 'Figma available on server' : 'Figma optional'} <ChevronDown size={14}/></small></summary><div className="connections-body"><p>Use your own keys in ProdOps—no separate Claude window needed. Keys stay in this tab’s memory and are sent through this ProdOps server only when you use the integration. They are cleared on reload or disconnect, and are not included in project downloads.</p><p className="connection-warning"><LockKeyhole size={14}/> Only enter keys on HTTPS or localhost, on a server you trust. The server and its hosting infrastructure can see the keys. Claude API usage may be billed; Figma uses read-only file access.</p><div className="connection-grid"><section><div className="connection-heading"><h3>Claude</h3><span>{claude ? 'Connected' : serverConfigured ? `${serverProvider === 'anthropic' ? 'Claude' : 'AI'} configured on server` : 'Not connected'}</span></div><p>Create an Anthropic API key; a Claude subscription alone does not provide an API key. Connecting sends a small test request that may incur a charge.</p>{claude ? <><p className="connection-ready">Using {claude.model} in this tab.</p><button className="button outline small" onClick={()=>{setClaude(null);setClaudeMessage('Claude disconnected from this tab.');}}>Disconnect Claude</button></> : <><label htmlFor="claude-api-key">Claude API key</label><input id="claude-api-key" type="password" autoComplete="off" spellCheck={false} placeholder="Paste your Anthropic API key" value={claudeKey} disabled={testingClaude} onChange={e=>setClaudeKey(e.target.value)}/><label htmlFor="claude-model">Claude model ID</label><input id="claude-model" value={model} maxLength={100} disabled={testingClaude} onChange={e=>setModel(e.target.value)}/><button className="button accent small" disabled={testingClaude} onClick={()=>void connectClaude()}>{testingClaude ? 'Checking…' : 'Connect Claude'}</button></>}<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Get an Anthropic API key ↗</a>{claudeMessage && <p role="status" className="connection-status">{claudeMessage}</p>}</section><section><div className="connection-heading"><h3>Figma</h3><span>{figma?.verified ? 'Connected' : figma ? 'Key added · not verified' : figmaServer ? 'Configured on server' : 'Not connected'}</span></div><p>Create a Figma personal access token with <b>file_content:read</b>, and give it access to your design file. Frame imports are read-only.</p>{figma ? <><p className="connection-ready">Token added for this tab.</p><label htmlFor="figma-test-link">Frame link to test (optional)</label><input id="figma-test-link" type="url" value={frame} onChange={e=>setFrame(e.target.value)} placeholder="https://www.figma.com/design/…?node-id=…"/><div className="step-buttons"><button className="button outline small" disabled={testingFigma || !frame.trim()} onClick={()=>void testFigma()}>{testingFigma ? 'Checking…' : 'Test Figma frame'}</button><button className="button outline small" disabled={testingFigma} onClick={()=>{setFigma(null);setFigmaMessage('Figma disconnected from this tab.')}}>Disconnect Figma</button></div></> : <><label htmlFor="figma-api-token">Figma personal access token</label><input id="figma-api-token" type="password" autoComplete="off" spellCheck={false} placeholder="Paste your Figma token" value={figmaKey} onChange={e=>setFigmaKey(e.target.value)}/><button className="button accent small" onClick={connectFigma}>Connect Figma</button></>}<a href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noreferrer">How to create a Figma token ↗</a>{figmaMessage && <p role="status" className="connection-status">{figmaMessage}</p>}</section></div></div></details>
}
