/**
 * What the captured clone actually contains, and how to serve it.
 *
 * ProdOps serves the captured site from a local copy. The capture is
 * server-rendered markup without the Rails/Inertia bundle behind it, so every
 * page needs three repairs before it is served: no bot challenge, no analytics
 * or hydration payload reaching a dead origin, and the behaviour React would
 * have provided (`./runtime.ts`).
 *
 * HTTrack got most of the site, but 21 pages came back as Cloudflare
 * "Just a moment…" challenge screens — the crawler was treated as a bot. Those
 * files are in the repo and they look like pages, so they must be handled
 * explicitly: served as a plain local notice, never as a live challenge, which
 * would run Cloudflare's script and try to navigate (or close) the tab.
 *
 * Both the server and the check import from here, so "blocked" means the same
 * thing in both places.
 */
import { RUNTIME, restoreEmails } from './runtime'
import { rebrand } from './brand'

export const isBlocked = (html: string): boolean =>
  html.includes('challenges.cloudflare.com') || /<title>\s*Just a moment/i.test(html)

export const PILL = `
<div id="prodops-pill" style="position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;align-items:center;gap:10px;
  padding:9px 12px;border-radius:999px;border:1px solid #2b2b2b;background:#111;color:#fafafa;
  font:500 12.5px/1 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:0 10px 30px -14px rgba(0,0,0,.9)">
  <span style="width:7px;height:7px;border-radius:50%;background:#ff5c1a"></span>
  <span>ProdOps · local copy — no email, no keys</span>
  <a href="/workspace/" style="padding:6px 10px;border-radius:999px;background:#ff5c1a;color:#0a0a0a;text-decoration:none;font-weight:600">Open ProdOps</a>
</div>`

/**
 * The motion and colour the captured markup lost.
 *
 * The live site's sections fade up as they enter the viewport and its buttons
 * and links carry an accent that moves on hover. All of it lived in the React
 * bundle, so the capture has none of it. Two rules, both inert until the
 * runtime sets `pe-motion` on `<html>` — a page without JavaScript, or a reader
 * who asked for reduced motion, sees the plain document.
 */
const MOTION_CSS = `<style id="prodops-motion">
  /* ---- 1. the page arrives -------------------------------------------- */
  html.pe-motion main section,
  html.pe-motion main article {
    opacity: 0;
    transform: translateY(14px);
    transition: opacity .55s cubic-bezier(.2,.7,.3,1), transform .55s cubic-bezier(.2,.7,.3,1);
  }
  html.pe-motion main section.pe-in,
  html.pe-motion main article.pe-in {
    opacity: 1;
    transform: none;
  }

  /* ---- 2. colour that moves ------------------------------------------- */
  /* The capture is a still photograph of a site that breathes: the accent
     glows behind the hero, the headline carries it in a slow sweep, and the
     wordmark drifts a few degrees of hue. All of it runs on load, with no
     interaction and nothing to scroll to — the point is that it is visible
     immediately, not that it is subtle. Layout never changes: only colour,
     filter and transform on elements that were already positioned. */
  .ds-hero { position: relative; isolation: isolate; }
  .ds-hero::before {
    content: '';
    position: absolute;
    inset: -12% -6% auto -6%;
    height: 78%;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(42% 62% at 18% 18%, rgba(255, 92, 26, .28), transparent 70%),
      radial-gradient(36% 56% at 82% 8%, rgba(255, 154, 92, .22), transparent 72%),
      radial-gradient(46% 62% at 56% 66%, rgba(216, 60, 11, .18), transparent 74%);
    animation: prodops-drift 18s ease-in-out infinite alternate;
  }
  @keyframes prodops-drift {
    from { transform: translate3d(-3%, -2%, 0) scale(1); filter: blur(4px) hue-rotate(0deg); }
    to { transform: translate3d(4%, 3%, 0) scale(1.14); filter: blur(12px) hue-rotate(-20deg); }
  }

  /* The headline keeps its own colour as the gradient's base, so an
     unsupported background-clip falls back to plain text, not to a blank. */
  .ds-hero h1 {
    background-image: linear-gradient(
      100deg,
      currentColor 0%, currentColor 22%,
      #ff5c1a 38%, #ffb27a 46%, #ff6a24 54%, #d8430a 62%,
      currentColor 78%, currentColor 100%
    );
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: prodops-sweep 7s ease-in-out infinite;
  }
  @keyframes prodops-sweep {
    0%, 100% { background-position: 0% 0; }
    50% { background-position: 100% 0; }
  }

  .kicker, .text-brand, .ds-footer .kicker {
    animation: prodops-ember 5s ease-in-out infinite alternate;
  }
  @keyframes prodops-ember {
    from { color: #c93c07; }
    to { color: #ffa06a; }
  }

  /* The chosen tab and the Access Free button carry the accent in a gradient
     that drifts, so the colour is moving wherever the reader looks first. */
  .prodops-tab[aria-selected="true"], .prodops-access {
    background-image: linear-gradient(100deg, #ff5c1a, #ffb27a 30%, #d8430a 55%, #ff8a4d 78%, #ff5c1a);
    background-size: 300% 100%;
    animation: prodops-sweep 6s linear infinite;
  }

  .ds-wordmark { animation: prodops-mark-hue 8s ease-in-out infinite alternate; }
  @keyframes prodops-mark-hue {
    from { filter: hue-rotate(0deg) saturate(1.05); }
    to { filter: hue-rotate(-30deg) saturate(1.3); }
  }

  /* A hairline of the accent under the header that travels as you read. */
  .ds-public-header::after {
    content: '';
    display: block;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff5c1a, #ff9a5c, #d83c0b, transparent);
    background-size: 240% 100%;
    animation: prodops-rail 7s linear infinite;
    opacity: .85;
  }
  @keyframes prodops-rail {
    from { background-position: 0% 0; }
    to { background-position: 240% 0; }
  }

  /* ---- 3. the pointer still gets an answer ---------------------------- */
  a[href], button { transition: color .18s ease, background-color .18s ease, border-color .18s ease, transform .18s ease; }
  a[href]:hover, button:hover { color: #ff5c1a; }
  a[href]:active, button:active { transform: translateY(1px); }

  /* ---- 4. the tool browser: tabs, one panel, no page loads ------------- */
  /* These are the capture's own tokens, not a second design language: the tab
     is a .ds-docs-link (hairline border, --radius-control), the panel is a
     .ds-card (--color-surface, --radius-card, 32px), the button is the site's
     filled .btn. The only liberty is that the selected tab keeps a slow drift
     of the brand colour, because the colour animation was asked for twice. */
  /* The page reads left to right, like the rest of the site: the captured
     index down the left, the browser beside it. Under 1080px the two columns
     stack with the index first, which is the page exactly as it was captured. */
  .prodops-browser {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .prodops-index, .prodops-detail { min-width: 0; }
  .prodops-browser .ds-thin { max-width: none; }
  @media (min-width: 1080px) {
    .prodops-browser {
      grid-template-columns: minmax(300px, 0.86fr) minmax(0, 1.14fr);
      gap: 48px;
      align-items: start;
    }
    /* The index stays put while the panel scrolls past it. */
    .prodops-index { position: sticky; top: 96px; }
  }
  .prodops-tools { margin: 0; }
  .prodops-tabstrip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 22px;
  }
  .prodops-tab {
    appearance: none;
    border: 1px solid var(--color-hairline);
    background: transparent;
    color: var(--color-body);
    border-radius: var(--radius-control);
    padding: 9px 15px;
    font: 500 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
    letter-spacing: -.01em;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color .18s ease, color .18s ease, background .18s ease;
  }
  .prodops-tab:hover { border-color: var(--color-brand); color: var(--color-brand); }
  .prodops-tab[aria-selected="true"] {
    color: #fff;
    border-color: transparent;
    background-image: linear-gradient(100deg, var(--color-brand), #d8430a 45%, #f97333 62%, var(--color-brand));
    background-size: 220% 100%;
    animation: prodops-sweep 9s ease-in-out infinite;
  }
  .prodops-toolpanel {
    background: var(--color-surface);
    border: 1px solid var(--color-hairline);
    border-radius: var(--radius-card);
    padding: 30px 32px 32px;
    animation: prodops-fade .28s ease both;
  }
  @keyframes prodops-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .prodops-panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 14px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--color-hairline);
  }
  .prodops-panel-head h2 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
  .prodops-panel-kind {
    margin: 0 0 6px;
    font: 600 10.5px/1 ui-monospace, mono;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--color-brand);
  }
  .prodops-toolpanel h3 { margin: 26px 0 8px; }
  .prodops-toolpanel p, .prodops-toolpanel li { line-height: 1.65; }
  .prodops-toolpanel pre { overflow: auto; }
  .prodops-panel-loading { font: 500 14px/1.6 system-ui, sans-serif; color: var(--color-muted, #6b6560); }

  /* The gate: the real site trades an email for the download. Here the button
     keeps its promise and opens the install instructions that ship with the
     copy — no list, no server, nothing sent. */
  .prodops-access {
    appearance: none;
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    padding: 13px 22px;
    font: 600 15px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #fff;
    background-image: linear-gradient(100deg, var(--color-brand), #d8430a 45%, #f97333 62%, var(--color-brand));
    background-size: 220% 100%;
    animation: prodops-sweep 9s ease-in-out infinite;
    cursor: pointer;
  }
  .prodops-access:hover { filter: brightness(1.06); }
  .prodops-install {
    margin-top: 14px;
    border: 1px dashed color-mix(in srgb, var(--color-brand) 45%, transparent);
    border-radius: var(--radius-control);
    padding: 16px 18px;
    background: color-mix(in srgb, var(--color-brand) 6%, transparent);
    animation: prodops-fade .28s ease both;
  }
  .prodops-install h4 { margin: 0 0 8px; font-size: 15px; }
  .prodops-install ol { margin: 0 0 10px; padding-left: 20px; }
  .prodops-install li { margin: 4px 0; }
  .prodops-install code {
    font: 500 12px/1.5 ui-monospace, monospace;
    background: color-mix(in srgb, currentColor 8%, transparent);
    border-radius: 5px;
    padding: 1px 5px;
  }
  .prodops-install .prodops-install-links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px;
    font: 600 13px/1 system-ui, sans-serif; }
  .prodops-install .prodops-install-links a { color: #d8430a; text-decoration: none; }

  /* The instructions behind "Access Free": the section a reader expects to find
     under Installation, which the live site keeps behind an email and the
     capture therefore never had. */
  .prodops-install-section {
    margin: 18px 0 8px;
    border: 1px solid var(--color-hairline);
    border-left: 3px solid var(--color-brand);
    border-radius: var(--radius-card);
    padding: 22px 24px 18px;
    background: var(--color-surface);
    animation: prodops-fade .3s ease both;
  }
  .prodops-install-section h3 { margin: 0 0 10px; }
  .prodops-install-section h4 { margin: 22px 0 8px; font-size: 15px; }
  .prodops-install-section p { margin: 0 0 10px; line-height: 1.65; }
  .prodops-install-section pre {
    margin: 0 0 6px;
    padding: 14px 16px;
    overflow: auto;
    border-radius: var(--radius-control);
    background: color-mix(in srgb, var(--color-brand) 7%, transparent);
    font: 500 12.5px/1.7 ui-monospace, 'SFMono-Regular', Menlo, monospace;
  }
  .prodops-install-section code { font: inherit; }
  .prodops-install-note { margin-top: 14px; font-size: 13px; color: var(--color-muted, #6b6560); }
  .prodops-install-links { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px;
    font: 600 13px/1.4 system-ui, sans-serif; }
  .prodops-install-links a { color: var(--color-brand); text-decoration: none; }
  .prodops-gate { margin: 4px 0 0; }
  .prodops-install-section.prodops-flash {
    animation: prodops-flash 1.5s ease both;
  }
  @keyframes prodops-flash {
    0% { box-shadow: 0 0 0 0 rgba(255, 92, 26, .55); }
    60% { box-shadow: 0 0 0 10px rgba(255, 92, 26, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 92, 26, 0); }
  }

  /* ---- 5. motion is optional ------------------------------------------ */
  @media (prefers-reduced-motion: reduce) {
    /* Nothing slides, blurs or travels — but the colour still moves. A reader
       who asked for less motion did not ask for a grey page, and a hue shift
       is not a vestibular event. This is also the setting most likely to be on:
       with macOS "Reduce motion" enabled, the copy would otherwise look like a
       still photograph and the colour animation would look broken. */
    html.pe-motion main section,
    html.pe-motion main article { opacity: 1 !important; transform: none !important; transition: none !important; }
    .ds-hero::before, .ds-public-header::after,
    .prodops-tab[aria-selected="true"], .prodops-access {
      animation: prodops-tint 9s ease-in-out infinite alternate !important;
    }
    .ds-hero h1 { animation: prodops-sweep 16s ease-in-out infinite !important; }
    .ds-wordmark { animation: prodops-tint 10s ease-in-out infinite alternate !important; }
    .kicker, .text-brand { animation: prodops-ember 7s ease-in-out infinite alternate !important; }
    .prodops-toolpanel, .prodops-install, .prodops-install-section { animation: none !important; }
  }
  @keyframes prodops-tint {
    from { filter: hue-rotate(0deg) saturate(1); }
    to { filter: hue-rotate(-26deg) saturate(1.28); }
  }
</style>`

/** The tool pages get one extra line: the gate they open with is already satisfied. */
const TOOLBAR = `<div id="prodops-toolbar" style="padding:10px 16px;border-bottom:1px solid #2b2b2b;background:#111;color:#fafafa;
  font:500 12.5px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif">
  This tool is installed in ProdOps — it runs locally, with no email, model or key.
  <a href="/workspace/" style="color:#ff5c1a;margin-left:6px">Open it →</a>
</div>`

const TOOL_PAGE = /^\/(tools|prd-creator|skill-builder|ai-design-system|favicon-creator|agentcanon|starter|rails-react-template|design-os|agent-os)(\/|\.html$|$)/

/** A standalone page for a capture that failed, in the site's own palette. */
export function blockedPage(path: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Not captured — ${path} · ProdOps</title>
  <style>
    :root { color-scheme: dark }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0a0a0a; color: #fafafa;
      font: 400 15px/1.6 system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .card { max-width: 560px; padding: 28px; border: 1px solid #2b2b2b; border-radius: 14px; background: #121212 }
    p.kicker { margin: 0 0 6px; font: 600 11px/1 ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; color: #ff5c1a }
    h1 { margin: 0 0 10px; font-size: 20px; font-weight: 600 }
    p { margin: 0 0 12px; color: #a3a3a3 }
    code { color: #e5e5e5; font-family: ui-monospace, monospace; font-size: 12.5px }
    a.btn { display: inline-block; margin-right: 8px; padding: 8px 14px; border-radius: 9px; text-decoration: none;
      font-weight: 600; font-size: 13px }
    a.primary { background: #ff5c1a; color: #0a0a0a }
    a.quiet { border: 1px solid #3a3a3a; color: #fafafa }
  </style>
</head>
<body>
  <div class="card">
    <p class="kicker">ProdOps · local copy</p>
    <h1>This page was not captured</h1>
    <p>
      The copy of the site was made by a crawler, and Cloudflare answered this URL with a
      "Just a moment…" challenge instead of the page. Rather than run that challenge here,
      this copy says so plainly.
    </p>
    <p><code>${path}</code></p>
    <p>
      The eight free tools are not affected: they are installed in ProdOps, together
      with the ProdOps commands, the Standards commands and the toolkit.
    </p>
    <p>
      <a class="btn primary" href="/workspace/">Open ProdOps</a>
      <a class="btn quiet" href="/">Home</a>
      <a class="btn quiet" href="/articles.html">Articles</a>
    </p>
  </div>
</body>
</html>`
}

/**
 * "Learn Agent Skills" is a cross-sell to the old brand's paid course, which has
 * no counterpart here. The section, its sidebar entry and its anchor go; every
 * other section of every tool page stays exactly where the capture put it,
 * including "Learn to build" and all of its words.
 */
const PROMOS = ['learn-agent-skills']

export function dropCoursePromos(html: string): string {
  let out = html
  for (const id of PROMOS) {
    // the "on this page" entry, in the mobile and the desktop sidebar
    out = out.replace(new RegExp(`<li>\\s*<a href="#${id}"[\\s\\S]*?</a>\\s*</li>`, 'gi'), '')
    // the section itself: from its heading to the next heading of the same rank
    out = out.replace(new RegExp(`<h3 id="${id}"[\\s\\S]*?(?=<h[23][ >])`, 'i'), '')
  }
  return out
}

/** Make a captured page offline and point it at the workspace. */
/**
 * The installation instructions, written for this package.
 *
 * The capture's Installation section is a gate and nothing else: the real site
 * keeps its instructions behind an email, and the crawler saw the wall, not the
 * words behind it. A reader of this copy is owed both — what the tool is, and
 * the three ways to get it — so each tool page gets the section the site would
 * have shown on the other side of the form, written against the files that are
 * actually in this repository. Nothing here needs a server, a key or an inbox.
 */
interface InstallFact {
  name: string
  /** The folder this tool writes into, as it exists in the package. */
  ships: string
  /** A skill is copied; a workflow is a set of commands in the same repo. */
  kind: 'skill' | 'template' | 'convention' | 'workflow'
}

const INSTALL: Record<string, InstallFact> = {
  '/prd-creator.html': { name: 'PRD Creator', ships: '.agents/skills/prd-creator/', kind: 'skill' },
  '/skill-builder.html': { name: 'Skill Builder', ships: '.agents/skills/skill-builder/', kind: 'skill' },
  '/ai-design-system.html': { name: 'Design System', ships: '.agents/skills/design-system/', kind: 'skill' },
  '/favicon-creator.html': { name: 'Favicon Creator', ships: '.agents/skills/favicon-creator/', kind: 'skill' },
  '/rails-react-template.html': { name: 'Starter', ships: 'template/starter/', kind: 'template' },
  '/agentcanon.html': { name: 'Agents canon', ships: '.agents/ + AGENTS.md + scripts/link-agents.sh', kind: 'convention' },
  '/agent-os.html': { name: 'Standards', ships: 'standards/ + .agents/commands/prodops/', kind: 'workflow' },
  '/design-os.html': { name: 'ProdOps flow', ships: 'product-plan/ + .agents/commands/prodops/', kind: 'workflow' },
}

const REPO = 'https://github.com/LulamileMkhungela/devzigner.git'

/** The section a visitor unlocks with "Access Free". */
function installSection(fact: InstallFact): string {
  const folder = fact.ships.split(/\s|\+/)[0]
  const copy =
    fact.kind === 'skill'
      ? `<pre><code>git clone ${REPO} prodops
cp -r prodops/${folder} ~/.agents/skills/                 # global: every project
# or into one project: cp -r prodops/${folder} your-app/.agents/skills/</code></pre>`
      : `<pre><code>git clone ${REPO} prodops
cp -r prodops/${folder} .                                 # into the project it belongs to</code></pre>`
  // Where the symlink goes depends on what was copied: a skill belongs in the
  // skills folder, the commands in the commands folder, a template in the app.
  const leaf = folder.replace(/\/$/, '').split('/').pop() ?? fact.name
  const link =
    fact.kind === 'skill'
      ? `ln -s "$PWD/prodops/${folder}" ~/.agents/skills/${leaf}`
      : fact.kind === 'workflow'
        ? `ln -s "$PWD/prodops/.agents/commands/prodops" ~/.agents/commands/prodops`
        : fact.kind === 'convention'
          ? `ln -s "$PWD/prodops/.agents" ./.agents && ln -s "$PWD/prodops/AGENTS.md" ./AGENTS.md`
          : `ln -s "$PWD/prodops/${folder}" ./${leaf}`
  const what =
    fact.kind === 'skill'
      ? 'the skill folder, its <code>SKILL.md</code> and every step file it names'
      : fact.kind === 'template'
        ? 'the starter app, its conventions and its setup script'
        : fact.kind === 'convention'
          ? '<code>AGENTS.md</code>, the skills folder it points at, and the script that links every agent to it'
          : 'the commands and the reference files they read'
  return `<section class="prodops-install-section" id="prodops-install" aria-label="Installation">
  <h3>Install ${fact.name}</h3>
  <p>${fact.name} ships in the ProdOps toolkit, built on the open Agent Skills standard, so it works with Claude
  Code, Codex, Cursor and any agent that reads skills. Three ways to install:</p>
  <h4>Option 1 — copy it into your project or your skills folder</h4>
  ${copy}
  <h4>Option 2 — link it, so one copy stays current</h4>
  <pre><code>${link}</code></pre>
  <h4>Option 3 — use it here, with nothing to install</h4>
  <p>Open ProdOps, choose <strong>Tools</strong>, then <strong>${fact.name}</strong>, and work through the same
  steps inside the workspace. What you get is ${what}; it ships at <code>${fact.ships}</code>.</p>
  <div class="prodops-install-links">
    <a href="/workspace/#tools">Open ProdOps →</a>
    <a href="/agentcanon.html">One canon for skills →</a>
    <a href="/tools.html">All eight tools →</a>
  </div>
  <p class="prodops-install-note">No email, no account, no key. This copy has no server behind it, so nothing is sent.</p>
</section>`
}

/**
 * Put the instructions where the gate is: the card that says "Get free access to
 * X and installation instructions" is followed by the instructions themselves.
 *
 * They are visible, not hidden behind the button. The point of the page is that
 * a reader can see all three ways to install without giving anyone an address;
 * pressing "Access Free" takes them to the section and marks it, which is what
 * the button promised and more than the email gate ever delivered.
 */
export function withInstall(html: string, path: string): string {
  const fact = INSTALL[path]
  if (!fact) return html
  // The gate does not use one shape: some pages put it in a `.ds-card` with a
  // sentence, others in a plain div under an `<h3>Get free access to …</h3>`.
  // What both have is the form, and a heading after it — so the instructions go
  // before that next heading, which is where the site would have put them.
  const gate = html.indexOf('Get free access to')
  if (gate === -1) return html
  const afterForm = html.indexOf('</form>', gate)
  const from = afterForm === -1 ? gate : afterForm
  const nextHeading = html.slice(from).search(/<h[23][\s>]/i)
  if (nextHeading === -1) {
    const article = html.lastIndexOf('</article>')
    if (article === -1) return html
    return html.slice(0, article) + installSection(fact) + html.slice(article)
  }
  const at = from + nextHeading
  return html.slice(0, at) + installSection(fact) + html.slice(at)
}

/**
 * Teaser clips are megabytes of binary that a text capture never picks up, and
 * committing them would bloat the repo. Swap each player for the same 16:9
 * panel with a note, so the page keeps its shape and says what is missing
 * instead of showing a dead control.
 */
export function replaceVideos(html: string): string {
  const note = (src: string) =>
    `<div class="prodops-video-note" role="img" aria-label="Teaser video (${src}) is not included in the offline copy" ` +
    `style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;text-align:center;` +
    `padding:24px;background:#111;color:#b9b2a8;font:500 13px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif">` +
    `Teaser video — not part of the offline copy</div>`
  return html.replace(/<video\b[^>]*?\bsrc="([^"]*)"[^>]*>[\s\S]*?<\/video>/g, (_m, src: string) => note(src))
}

export function adaptPage(html: string, path: string): string {
  if (isBlocked(html)) return blockedPage(path)

  let out = html
    .replace(/https:\/\/(?:www\.)?buildermethods\.com\//g, '/')
    // Analytics, Cloudflare's challenge and email obfuscator: three scripts that
    // can only fail here, and the challenge one tries to navigate the tab.
    .replace(/<script[^>]+src="[^"]*plausible\.io[^"]*"[^>]*><\/script>/g, '')
    .replace(/<script[^>]+src="[^"]*(?:email-decode|challenge-platform)[^"]*"[^>]*><\/script>/g, '')
    .replace(/<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?(?:__CF\$cv\$params|challenge-platform)(?:(?!<\/script>)[\s\S])*?<\/script>/g, '')
    // The Inertia entrypoint is present but its bundle is partial, and it would
    // try to hydrate a page whose props reference a Rails server that is absent.
    // The server-rendered markup it would have controlled is already complete.
    .replace(/<script[^>]+src="[^"]*vite\/assets\/inertia[^"]*"[^>]*><\/script>/g, '')
    // Dead hydration state: whole page-prop JSON, per page, including a
    // reCAPTCHA key and canonical URLs that point at the live site.
    .replace(/(<div id="app"[^>]*?)\sdata-page="[\s\S]*?"/g, '$1')

  // The crawler leaves a "Mirrored from https://…" comment on every page. It
  // is not part of the site, and the address it names is not this site's.
  out = out.replace(/<!--\s*Mirrored from[\s\S]*?-->/gi, '')
  out = restoreEmails(out)
  out = withInstall(out, path)
  out = dropCoursePromos(out)
  out = replaceVideos(out)
  // The name, the mark, the byline and the handles, on the way out. `site/`
  // itself stays an untouched capture; see scripts/lib/brand.ts.
  out = rebrand(out, path)

  if (TOOL_PAGE.test(path)) {
    out = out.replace('<body>', `<body>\n${TOOLBAR}`)
  }

  return out.replace('</body>', `${MOTION_CSS}\n${PILL}\n${RUNTIME}\n</body>`)
}
