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
      currentColor 0%, currentColor 34%,
      #ff5c1a 48%, #ffa06a 56%, #e0500f 64%,
      currentColor 78%, currentColor 100%
    );
    background-size: 260% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: prodops-sweep 11s ease-in-out infinite;
  }
  @keyframes prodops-sweep {
    0%, 100% { background-position: 0% 0; }
    50% { background-position: 100% 0; }
  }

  .kicker, .text-brand, .ds-footer .kicker {
    animation: prodops-ember 7s ease-in-out infinite alternate;
  }
  @keyframes prodops-ember {
    from { color: #d8430a; }
    to { color: #ff8a4d; }
  }

  .ds-wordmark { animation: prodops-mark-hue 14s ease-in-out infinite alternate; }
  @keyframes prodops-mark-hue {
    from { filter: hue-rotate(0deg) saturate(1); }
    to { filter: hue-rotate(-18deg) saturate(1.18); }
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
  .prodops-tools { margin: 0; }
  .prodops-tabstrip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 2px 0 18px;
    padding-bottom: 2px;
  }
  .prodops-tab {
    appearance: none;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    color: inherit;
    border-radius: 999px;
    padding: 8px 15px;
    font: 600 13px/1 system-ui, -apple-system, 'Segoe UI', sans-serif;
    letter-spacing: -.01em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
  }
  .prodops-tab:hover { border-color: color-mix(in srgb, #ff5c1a 55%, transparent); }
  .prodops-tab[aria-selected="true"] {
    color: #fff;
    border-color: transparent;
    background-image: linear-gradient(100deg, #ff5c1a, #d83c0b 42%, #ff9a5c 58%, #d83c0b 100%);
    background-size: 240% 100%;
    animation: prodops-sweep 7s ease-in-out infinite;
    box-shadow: 0 6px 18px -10px rgba(216, 60, 11, .9);
  }
  .prodops-tab small {
    display: block;
    font: 500 10.5px/1 ui-monospace, monospace;
    opacity: .7;
    margin-top: 4px;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .prodops-toolpanel {
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    border-radius: 16px;
    padding: 20px 22px 24px;
    background: color-mix(in srgb, currentColor 2.5%, transparent);
    animation: prodops-fade .28s ease both;
  }
  @keyframes prodops-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .prodops-panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 14px;
    margin-bottom: 6px;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  }
  .prodops-panel-head h2 { margin: 0; font-size: 22px; letter-spacing: -.02em; }
  .prodops-panel-kind { font: 600 10.5px/1 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase;
    color: #d8430a; }
  .prodops-toolpanel h3, .prodops-toolpanel h4 { margin: 22px 0 8px; }
  .prodops-toolpanel p, .prodops-toolpanel li { line-height: 1.65; }
  .prodops-toolpanel pre { overflow: auto; }
  .prodops-panel-foot { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px;
    padding-top: 16px; border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
  .prodops-panel-loading { font: 500 13px/1.6 system-ui, sans-serif; opacity: .72; }

  /* The gate: the real site trades an email for the download. Here the button
     keeps its promise and opens the install instructions that ship with the
     copy — no list, no server, nothing sent. */
  .prodops-access {
    appearance: none;
    border: 0;
    border-radius: 10px;
    padding: 11px 18px;
    font: 600 14px/1 system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #fff;
    background-image: linear-gradient(100deg, #ff5c1a, #d83c0b 45%, #ff9a5c 60%, #d83c0b 100%);
    background-size: 240% 100%;
    animation: prodops-sweep 7s ease-in-out infinite;
    cursor: pointer;
  }
  .prodops-access:hover { filter: brightness(1.06); }
  .prodops-install {
    margin-top: 14px;
    border: 1px dashed color-mix(in srgb, #ff5c1a 45%, transparent);
    border-radius: 12px;
    padding: 16px 18px;
    background: color-mix(in srgb, #ff5c1a 6%, transparent);
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

  /* ---- 5. motion is optional ------------------------------------------ */
  @media (prefers-reduced-motion: reduce) {
    html.pe-motion main section,
    html.pe-motion main article { opacity: 1 !important; transform: none !important; transition: none !important; }
    .ds-hero::before, .ds-hero h1, .kicker, .text-brand, .ds-wordmark,
    .ds-public-header::after, .prodops-tab, .prodops-access, .prodops-toolpanel, .prodops-install {
      animation: none !important;
    }
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
 * Two sections of the capture sell a course: "Learn Agent Skills" and "Learn to
 * build". Both are cross-sells to the old brand's paid programme, which has no
 * counterpart here — the tools are installed, not sold — so the section, its
 * sidebar entry and its anchor all go. Nothing else in either article moves.
 */
const PROMOS = ['learn-agent-skills', 'learn-to-build']

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

  out = restoreEmails(out)
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
