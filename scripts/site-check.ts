/**
 * Is the cloned site actually the site?
 *
 * `site/` is an HTTrack copy of buildermethods.com. Copying files is not the
 * same as shipping a site: a page can be an empty shell, a link can point at a
 * file that was never captured, and an absolute URL quietly sends the visitor
 * back online. This walks every captured page and every link in it, so the
 * answer is a count, not a claim.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, normalize, relative, sep } from 'node:path'
import { JSDOM } from 'jsdom'
import { adaptPage, blockedPage, isBlocked } from './lib/clone'
import { decodeCfEmail, restoreEmails } from './lib/runtime'

const SITE = 'site'

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(SITE)
// Cloudflare's own artifacts and an image stored under an .html name are not
// pages of the site, so they are not held to a page's standard.
const html = files
  .filter((file) => file.endsWith('.html'))
  .filter((file) => !file.includes(`cdn-cgi${sep}`) && !file.includes('active_storage'))
  .sort()
const exists = new Set(files.map((file) => normalize(file)))

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'ERR '} ${label}${detail ? ` — ${detail}` : ''}`)
}

/* ---- pages: real content, not an empty shell ---------------------------- */

const visibleText = (markup: string) =>
  markup
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const thin: string[] = []
const blocked: string[] = []
const pages: { file: string; chars: number }[] = []
for (const file of html) {
  const markup = readFileSync(file, 'utf8')
  if (isBlocked(markup)) {
    blocked.push(relative(SITE, file))
    continue
  }
  const text = visibleText(markup)
  pages.push({ file, chars: text.length })
  // A login form is short by design; a page with no title or a line of text is a shell.
  const hasTitle = /<title[^>]*>\s*[^<\s][^<]*<\/title>/i.test(markup)
  if (!hasTitle || text.length < 60) thin.push(`${relative(SITE, file)} (${text.length})`)
}

check(`${html.length} pages captured`, html.length >= 110, `${files.length} files total, ${pages.length} with content`)
check('every captured page has server-rendered content', thin.length === 0, thin.slice(0, 6).join(', '))

// The pages the project is about must be substantial, not merely non-empty.
const substantial = ['index.html', 'tools.html', 'design-os.html', 'agent-os.html', 'articles.html', 'pro.html']
const lightPages = substantial.filter((page) => {
  const entry = pages.find((candidate) => relative(SITE, candidate.file) === page)
  return !entry || entry.chars < 900
})
check('the pages that should be substantial are', lightPages.length === 0, lightPages.join(', '))

// A challenge screen is not a page. Serving it would run Cloudflare's script, so
// the server replaces it; this asserts every one of them is recognised.
const stillChallenging = blocked.filter((file) => !blockedPage(`/${file}`).includes('was not captured'))
check(`${blocked.length} Cloudflare-blocked pages are replaced, not served`, stillChallenging.length === 0, stillChallenging.slice(0, 4).join(', '))

/* ---- the pages this project is about ------------------------------------ */

const mustHave = [
  'index.html',
  'tools.html',
  'design-os.html',
  'agent-os.html',
  'ai-design-system.html',
  'prd-creator.html',
  'skill-builder.html',
  'favicon-creator.html',
  'agentcanon.html',
  'rails-react-template.html',
  'design-os/requirements.html',
  'agent-os/v2/workflows.html',
]
const missing = mustHave.filter((page) => !exists.has(normalize(join(SITE, page))) || blocked.includes(page))
check('every page the toolkit covers is present and real', missing.length === 0, missing.join(', '))

/* ---- links and images resolve ------------------------------------------- */

const broken: string[] = []
const clips: string[] = []
let internal = 0
for (const file of html) {
  const markup = readFileSync(file, 'utf8')
  for (const match of markup.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = match[1]
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(raw)) continue
    if (raw.includes('cdn-cgi/')) continue // Cloudflare's error-page styles, never part of the site
    internal++
    const pathOnly = raw.split('#')[0].split('?')[0]
    if (!pathOnly) continue
    if (pathOnly.includes('active_storage')) continue // an image served with an .html name
    if (/\.(mp4|webm|mov)$/i.test(pathOnly)) {
      // Teaser clips: binary the capture never downloads. adaptPage() swaps the
      // player for a labelled panel, checked below rather than resolved here.
      clips.push(`${relative(SITE, file)} → ${raw}`)
      continue
    }
    const target = normalize(join(dirname(file), decodeURIComponent(pathOnly)))
    const candidates = [target, `${target}.html`, join(target, 'index.html')]
    if (!candidates.some((candidate) => exists.has(candidate))) {
      broken.push(`${relative(SITE, file)} → ${raw}`)
    }
  }
}

check(`all ${internal} internal links and images resolve`, broken.length === 0, broken.slice(0, 8).join(' | '))

/* ---- teaser videos are replaced, not left as dead players ---------------- */
{
  const players = clips.map((entry) => entry.split(' → ')[0])
  // Parsed, not grepped: the injected runtime mentions video players in prose,
  // and a regex would count the explanation as a player.
  const stillPlayer = [...new Set(players)].filter(
    (page) => new JSDOM(adaptPage(readFileSync(join(SITE, page), 'utf8'), page)).window.document.querySelectorAll('video').length > 0,
  )
  check(
    `${clips.length} teaser video${clips.length === 1 ? '' : 's'} replaced with a labelled panel`,
    stillPlayer.length === 0,
    stillPlayer.join(', '),
  )
  const noted = [...new Set(players)].filter((page) =>
    /not part of the offline copy/.test(adaptPage(readFileSync(join(SITE, page), 'utf8'), page)),
  )
  check('every page that lost a video says so', noted.length === new Set(players).size, `${noted.length} of ${new Set(players).size}`)
}

/* ---- no absolute links that would leave the copy ------------------------ */

const online: string[] = []
for (const file of html) {
  const markup = readFileSync(file, 'utf8')
  const hits = markup.match(/href="https:\/\/(?:www\.)?buildermethods\.com[^"]*"/g) ?? []
  if (hits.length) online.push(`${relative(SITE, file)}: ${hits.length}`)
}

check('no absolute buildermethods.com hrefs remain', online.length === 0, online.slice(0, 6).join(', '))

/* ---- what the visitor actually receives --------------------------------- */

const unreplaced = html.filter((file) => isBlocked(readFileSync(file, 'utf8')) && !blockedPage(file).includes('Open ProdOps'))
check('the blocked-page template stands on its own', unreplaced.length === 0)

const home = readFileSync(join(SITE, 'index.html'), 'utf8')
const served = adaptPage(home, '/')
check('the homepage is served offline', !/https:\/\/(?:www\.)?buildermethods\.com\//.test(served))
check('the analytics tag is stripped', !served.includes('plausible.io'))
check('every page carries the workspace pill', served.includes('prodops-pill') && served.includes('/workspace/'))

const toolPage = adaptPage(readFileSync(join(SITE, 'tools.html'), 'utf8'), '/tools.html')
check('tool pages say the tool is installed locally', toolPage.includes('prodops-toolbar') && toolPage.includes('runs locally'))

/* ---- the build's own assets --------------------------------------------- */

const assetRefs = html.flatMap((file) => {
  const markup = readFileSync(file, 'utf8')
  return [...markup.matchAll(/(?:href|src)="(vite\/assets\/[^"]+)"/g)].map((match) => match[1])
})
const uniqueAssets = [...new Set(assetRefs)]
const missingAssets = uniqueAssets.filter((asset) => !exists.has(normalize(join(SITE, asset))))
check(`${uniqueAssets.length} built assets referenced, all present`, missingAssets.length === 0, missingAssets.join(', '))

/* ---- does it actually read as the site, with scripts off? ---------------- */

const rendered = new JSDOM(adaptPage(home, '/'), { runScripts: 'outside-only' })
const doc = rendered.window.document
const bodyText = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
const navLinks = [...doc.querySelectorAll('nav a')].map((a) => a.textContent?.trim()).filter(Boolean)

check('the homepage renders its copy with scripts off', bodyText.length > 2000, `${bodyText.length} chars`)
check(
  'its own navigation is in the markup',
  ['Workshops', 'Community', 'Tools'].every((label) => bodyText.includes(label)),
  navLinks.slice(0, 6).join(' · '),
)
check('the logo image is served locally', doc.querySelectorAll('img[src^="images/"]').length > 0)
check(
  'nothing on the page reaches buildermethods.com',
  !doc.documentElement.outerHTML.includes('buildermethods.com/'),
)

const tools = new JSDOM(adaptPage(readFileSync(join(SITE, 'tools.html'), 'utf8'), '/tools.html'))
const toolNames = ['PRD Creator', 'Skill Builder', 'Design System', 'Build New', 'agentcanon', 'Favicon', 'Agent OS', 'Design OS']
const toolsText = tools.window.document.body.textContent ?? ''
const missingTools = toolNames.filter((name) => !toolsText.includes(name))
check('the tools page lists all eight tools', missingTools.length === 0, missingTools.join(', '))

/* ---- the parts React used to provide ------------------------------------ */

/**
 * Every interactive control on buildermethods.com is client-rendered. The
 * capture has the markup and none of the behaviour, so the copy is only
 * faithful if the behaviour is restored. This boots the served homepage with
 * scripts on and operates it like a visitor: open the drawer, submit the form.
 */
const stub = (window: any) => {
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })
}

const live = new JSDOM(adaptPage(home, '/'), {
  url: 'http://localhost:5173/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse: stub,
})
await new Promise((resolve) => setTimeout(resolve, 250))
const liveDoc = live.window.document

check('the behaviour layer is served with the page', Boolean(liveDoc.getElementById('prodops-runtime')))
check('the Inertia entrypoint is not served', !liveDoc.querySelector('script[src*="inertia"]'))
check('no Cloudflare challenge survives', !liveDoc.documentElement.outerHTML.includes('challenge-platform'))
check('the dead hydration payload is stripped', !liveDoc.getElementById('app')?.hasAttribute('data-page'))
check('the theme is still resolved before first paint', /prefers-color-scheme/.test(liveDoc.documentElement.outerHTML))

const navToggle = liveDoc.querySelector('.ds-nav-toggle') as HTMLElement | null
check('the navigation has its toggle', Boolean(navToggle))
navToggle?.click()
await new Promise((resolve) => setTimeout(resolve, 80))
const drawer = liveDoc.querySelector('.ds-nav-mobile')
check(
  'the toggle opens a drawer with the real navigation',
  Boolean(drawer) && (drawer?.querySelectorAll('a').length ?? 0) >= 5,
  [...(drawer?.querySelectorAll('a') ?? [])].map((a) => a.textContent?.trim()).slice(0, 6).join(' · '),
)
check('the toggle reports its state', navToggle?.getAttribute('aria-expanded') === 'true')
navToggle?.click()
await new Promise((resolve) => setTimeout(resolve, 80))
check('and closes it again', !liveDoc.querySelector('.ds-nav-mobile'))

const capture = liveDoc.querySelector('form.capture') as HTMLFormElement | null
check('the newsletter form is on the page', Boolean(capture))
capture?.dispatchEvent(new live.window.Event('submit', { bubbles: true, cancelable: true }))
await new Promise((resolve) => setTimeout(resolve, 60))
check(
  'submitting it empty is answered, not ignored',
  /Enter an email address first/.test(liveDoc.querySelector('.local-form-note')?.textContent ?? ''),
  liveDoc.querySelector('.local-form-note')?.textContent ?? '',
)
const emailField = capture?.querySelector('input') as HTMLInputElement | null
if (emailField) emailField.value = 'reader@example.com'
capture?.dispatchEvent(new live.window.Event('submit', { bubbles: true, cancelable: true }))
await new Promise((resolve) => setTimeout(resolve, 60))
check(
  'a real submission says what this copy did with it',
  /Saved in this browser/.test(liveDoc.querySelector('.local-form-note')?.textContent ?? ''),
  liveDoc.querySelector('.local-form-note')?.textContent ?? '',
)
check(
  'the submission is kept in the browser, not posted',
  JSON.parse(live.window.localStorage.getItem('prodops.site.signups.v1') ?? '[]').length === 1,
)
live.window.close()

/* ---- tool pages: the email gate is satisfied, and says so ---------------- */

const gated = new JSDOM(adaptPage(readFileSync(join(SITE, 'prd-creator.html'), 'utf8'), '/prd-creator.html'), {
  url: 'http://localhost:5173/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse: stub,
})
await new Promise((resolve) => setTimeout(resolve, 250))
const gatedDoc = gated.window.document
check(
  'a tool\'s email gate becomes an installed-in-ProdOps notice',
  Boolean(gatedDoc.querySelector('[data-local-gate]')) &&
    /no email, key or account needed/.test(gatedDoc.querySelector('[data-local-gate]')?.textContent ?? ''),
)
check(
  'the gate form is gone, not left dead',
  ![...gatedDoc.querySelectorAll('form')].some((form) => /access free/i.test(form.textContent ?? '')),
  `${gatedDoc.querySelectorAll('form').length} form(s) left: ${[...gatedDoc.querySelectorAll('form')]
    .map((form) => (form.textContent ?? '').trim().slice(0, 24))
    .join(' | ')}`,
)
gated.window.close()

/* ---- a control with nothing behind it says so --------------------------- */

{
  // design-os.html opens with "Watch the demo", whose video was never captured.
  // A button that looks live and does nothing is the failure this fixes.
  const demo = new JSDOM(adaptPage(readFileSync(join(SITE, 'design-os.html'), 'utf8'), '/design-os.html'), {
    url: 'http://localhost:5173/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse: stub,
  })
  await new Promise((resolve) => setTimeout(resolve, 250))
  const doc = demo.window.document
  check('the demo page shows a labelled video panel', Boolean(doc.querySelector('.prodops-video-note')))
  const demoButton = [...doc.querySelectorAll('button')].find((button) => /watch the demo|teaser/i.test(button.textContent ?? '') || button.hasAttribute('aria-disabled'))
  check(
    'the "Watch the demo" control is marked unavailable, not left clickable',
    Boolean(demoButton) && demoButton!.getAttribute('aria-disabled') === 'true',
    demoButton?.getAttribute('title') ?? '',
  )
  demo.window.close()
}

/* ---- Cloudflare's obfuscated addresses are decoded ---------------------- */

check(
  'the obfuscated email addresses are decoded',
  decodeCfEmail('2f5c5a5f5f405d5b6f4d5a46434b4a5d424a5b47404b5c014c4042') === 'support@buildermethods.com',
  decodeCfEmail('2f5c5a5f5f405d5b6f4d5a46434b4a5d424a5b47404b5c014c4042'),
)
const privacy = readFileSync(join(SITE, 'privacy.html'), 'utf8')
check(
  'a page that shipped `[email protected]` now shows the address',
  restoreEmails(privacy).includes('mailto:') && !restoreEmails(privacy).includes('[email&#160;protected]'),
)

/* ---- every page gets the same repairs ---------------------------------- */

const unrepaired: string[] = []
const stillScripted: string[] = []
// Blocked captures are served as a local notice instead of the page, so they
// are the only pages that legitimately have no layer to carry.
let repaired = 0
for (const file of html) {
  const page = relative(SITE, file)
  const source = readFileSync(file, 'utf8')
  const out = adaptPage(source, `/${page.replace(/\.html$/, '')}`)
  if (isBlocked(source)) {
    if (isBlocked(out)) unrepaired.push(page)
    continue
  }
  repaired++
  if (!out.includes('prodops-runtime')) stillScripted.push(page)
}
check(`all ${repaired} captured pages carry the behaviour layer`, stillScripted.length === 0, stillScripted.slice(0, 5).join(', '))
check('no served page is a live challenge', unrepaired.length === 0, unrepaired.slice(0, 5).join(', '))

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log(
  `\nthe clone is complete: ${pages.length} pages with content, ${blocked.length} replaced challenge pages, ` +
    `${internal} working internal links, ${uniqueAssets.length} assets`,
)
export {}
