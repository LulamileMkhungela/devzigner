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
  @media (prefers-reduced-motion: reduce) {
    html.pe-motion main section,
    html.pe-motion main article { opacity: 1 !important; transform: none !important; transition: none !important; }
  }
  /* The accent answers the pointer, on both of the site's button shapes. */
  a[href], button { transition: color .18s ease, background-color .18s ease, border-color .18s ease, transform .18s ease; }
  a[href]:hover, button:hover { color: #ff5c1a; }
  a[href]:active, button:active { transform: translateY(1px); }
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
  <title>Not captured — ${path}</title>
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
      The eight free tools are not affected: they are installed in ProdOps, along with
      ProdOps's ten commands, Standards's five and the four toolkit.
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
  out = replaceVideos(out)

  if (TOOL_PAGE.test(path)) {
    out = out.replace('<body>', `<body>\n${TOOLBAR}`)
  }

  return out.replace('</body>', `${MOTION_CSS}\n${PILL}\n${RUNTIME}\n</body>`)
}
