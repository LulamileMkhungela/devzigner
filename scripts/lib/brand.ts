/**
 * The served site is ProdOps's site.
 *
 * `site/` is a copy of a public site, and a copy carries that site's name in
 * places a link rewriter cannot reach: the `<title>`, the Open Graph block, the
 * JSON-LD, the wordmark images, the bylines, the social handles and the contact
 * addresses. Serving it as-is meant the visitor read someone else's brand on
 * every page of a product that has nothing to do with them.
 *
 * So the copy is rebranded at serve time, not on disk. `site/` stays a faithful
 * capture — which matters if it is ever diffed against the original — and every
 * response goes through `rebrand()` on its way out. Nothing here is layout or
 * copywriting: it is the name, the mark, the byline and the handles.
 *
 * The transforms are deliberately conservative:
 *
 *   1. longest phrase first, so "Builder Methods Pro" never becomes
 *      "ProdOps Pro" by accident of order;
 *   2. no HTML parsing — the replacement runs on the serialised document, and
 *      every pattern is anchored to plain text that appears in it;
 *   3. the wordmarks become inline data URIs, so a rebranded page still has its
 *      logo when opened from `file://` with no server.
 *
 * `site-check` asserts the result: no served page may contain the old brand,
 * the old byline or the old handles, and every page's title has to name ProdOps.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function dataUri(name: string): string {
  const svg = readFileSync(join(root, 'public', name), 'utf8')
  // Inline SVG as a URI: no request, no CORS, works from file://.
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

/**
 * The capture's wordmarks and its author portrait were deleted with the rest of
 * the old brand, and their image URLs were rewritten on disk to ProdOps names
 * (`images/logos/prodops-wordmark.svg`, `images/marks/prodops-mark.svg`), so no
 * page — mirrored or served — asks for a file named after someone else.
 *
 * What is left here is the favicon set: the capture had three raster icons, the
 * site ships one SVG mark, and these aliases keep the old URLs answering
 * instead of 404ing for a browser with a cached icon.
 */
export const LEGACY_ASSETS: Record<string, string> = {
  '/favicon/favicon.ico': 'site/favicon/icon.svg',
  '/favicon/icon-192.png': 'site/favicon/icon.svg',
  '/favicon/apple-touch-icon.png': 'site/favicon/icon.svg',
}

let cached: { light: string; dark: string } | null = null
function marks() {
  if (!cached) cached = { light: dataUri('prodops-wordmark-light.svg'), dark: dataUri('prodops-wordmark.svg') }
  return cached
}

/**
 * The square mark, for the places the capture used a photograph: a 40px avatar
 * in the sign-off, an author portrait, a blurred hero. A wordmark would be
 * unreadable at that size, so those slots get the mark instead.
 */
let markUri: string | null = null
function mark() {
  if (!markUri) markUri = dataUri('prodops-mark.svg')
  return markUri
}

/** The old brand and everybody it named, in the order they must be replaced. */
const PHRASES: [RegExp, string][] = [
  // Pro / the newsletter, before the bare name.
  [/Builder Methods Pro/g, 'ProdOps Pro'],
  [/The Builder Briefing/g, 'The ProdOps Briefing'],
  [/Builder Briefing/g, 'ProdOps Briefing'],
  [/Builder Methods/g, 'ProdOps'],
  [/Builder Methods’/g, 'ProdOps’'],
  [/CasJam Media LLC/g, 'Lulamile Mkhungela'],
  // The byline, in the forms the copy uses it.
  [/Brian Casel/g, 'Lulamile Mkhungela'],
  [/Brian’s/g, 'Lulamile’s'],
  [/Brian's/g, 'Lulamile’s'],
  [/Brian/g, 'Lulamile'],
  // Repositories, handles and hosts.
  [/github\.com\/buildermethods\//g, 'github.com/LulamileMkhungela/'],
  // The five upstream repositories are one repository here, so a link to any of
  // them points at the package that now carries all five.
  [
    /github\.com\/LulamileMkhungela\/(?:agent-os|design-os|bm-skills|build-new|agentcanon)\b/g,
    'github.com/LulamileMkhungela/devzigner',
  ],
  // Captured install snippets curl a setup script from the old organisation.
  // That script is not ours to publish, so the mirrored command points at this
  // repository's own `scripts/` directory instead of a stranger's.
  [
    /raw\.githubusercontent\.com\/buildermethods\/[^"'\s<>]*/g,
    'raw.githubusercontent.com/LulamileMkhungela/devzigner/main/scripts/install.sh',
  ],
  // The JSON-LD identifies the author by a URL fragment, lower-case.
  [/#brian-casel/g, '#lulamile-mkhungela'],
  [/briancasel\.com/g, 'github.com/LulamileMkhungela'],
  [/briancasel/g, 'lulamilemkhungela'],
  [/CasJam/g, 'LulamileMkhungela'],
  [/casjam/g, 'lulamilemkhungela'],
  [/buildermethods\.com/g, 'prodops.dev'],
  [/(?:www\.)?youtube\.com\/@LulamileMkhungela[^"'\s<>]*/g, 'github.com/LulamileMkhungela'],
  [/x\.com\/LulamileMkhungela[^"'\s<>]*/g, 'github.com/LulamileMkhungela'],
]

/**
 * The five products in the capture, and what they are called here.
 *
 * ProdOps ships the same five things under its own names: the eight tools in
 * the workspace are PRD Creator, Skill Builder, Design System, Starter, Agents
 * canon, Favicon Creator, Standards and ProdOps flow. Renaming them in the
 * served copy is what makes the site ProdOps's site rather than a catalogue of
 * somebody else's products.
 *
 * These are *display* names, matched case-sensitively and applied to the text
 * of the document only — never inside a tag, where a product name can also be a
 * file name. The capture's lower-case slugs (`/agent-os/installation` and
 * friends) are left alone for the same reason: they are the mirror's own paths,
 * every link in the capture points at them, and renaming them would trade a
 * cosmetic mismatch for a site full of 404s.
 */
const PRODUCTS: [RegExp, string][] = [
  [/Agent OS’s/g, 'Standards’'],
  [/Agent OS's/g, 'Standards’'],
  [/Agent OS/g, 'Standards'],
  [/Design OS’s/g, 'ProdOps’'],
  [/Design OS's/g, 'ProdOps’'],
  [/Design OS/g, 'ProdOps'],
  [/Build New/g, 'Starter'],
  [/bm-skills/g, 'ProdOps skills'],
  [/agentcanon/g, 'Agents canon'],
]

/**
 * Where the old social links pointed, and where they point now.
 *
 * The tail is `[^"'\s<>]*`, not `\S*`: these attributes can sit in minified
 * JSON-LD with no whitespace after them, and a greedy `\S*` eats the closing
 * quote, then the tag, then the rest of the document.
 */
/**
 * Clean-up passes that only exist because two renames can meet in the middle.
 *
 * "Running Design OS" and the sentence after it both become ProdOps, and a
 * heading that reads "Pro" followed by "Pro renews automatically" becomes
 * "ProdOps Pro Pro renews". These run last, on the finished text.
 */
const CLEANUP: [RegExp, string][] = [
  [/ProdOps Pro Pro\b/g, 'ProdOps Pro'],
  [/ProdOps ProdOps\b/g, 'ProdOps'],
  [/\bProdOps Pro ProdOps Pro\b/g, 'ProdOps Pro'],
]

const HANDLES: [RegExp, string][] = [
  [/https:\/\/(?:www\.)?youtube\.com\/@lulamilemkhungela[^"'\s<>]*/g, 'https://github.com/LulamileMkhungela'],
  [/https:\/\/x\.com\/lulamilemkhungela[^"'\s<>]*/g, 'https://github.com/LulamileMkhungela'],
  [/https:\/\/linkedin\.com\/in\/lulamilemkhungela[^"'\s<>]*/g, 'https://github.com/LulamileMkhungela'],
]

/**
 * The captured wordmark is a raster-like SVG of the old logo in two tones; the
 * ProdOps mark is a square with a check, so the two variants are swapped in
 * whole rather than recoloured.
 */
function swapLogos(html: string): string {
  const { light, dark } = marks()
  // Article heroes and author portraits were pulled from the old site's object
  // store and are not part of the capture. Preloading them is pointless, and a
  // remote URL keeps the old brand in the markup; the mark stands in instead.
  html = html.replace(/<link[^>]+rel="preload"[^>]+as="image"[^>]*buildermethods[^>]*>/gi, '')
  // Preloading an image that is about to be inlined as a data URI is pointless,
  // and the capture preloads its wordmark and portrait on every page.
  html = html.replace(/<link[^>]+rel="preload"[^>]+as="image"[^>]*images\/(?:logos\/prodops-wordmark|marks\/prodops-mark)[^>]*>/gi, '')
  html = html.replace(/https:\/\/buildermethods[^"'\s<>]*/g, mark())
  // The portrait and the author avatar are a photograph of somebody who has
  // nothing to do with this product; the mark stands in for both. `(?<!/)`
  // keeps an absolute URL absolute: `https://prodops.dev/images/...` is a link
  // to a file this repository ships, and a data URI there would leave the host
  // glued to the front of it, as in `https://prodops.ddata:image/svg+xml...`.
  html = html.replace(/(?<!\/)(?:\.\.\/)*images\/marks\/prodops-mark\.svg/g, mark())
  // The reference may be relative — nested pages write ../images/logos/… — and
  // the prefix has to go with the path, or the data URI becomes "../data:".
  // The pattern is built from a string so the escape level is stated once.
  const logoRef = /(?<!\/)(?:\.\.\/)*images\/logos\/prodops-wordmark(-light)?\.svg/g
  return html.replace(logoRef, (match: string) => (match.includes('-light') ? light : dark))
}

/**
 * The tab icon.
 *
 * The capture ships four icons — an .ico, an SVG, a 192px PNG and an iOS touch
 * icon — all drawn as the old mark. The binaries are gone with the rest of the
 * brand (the SVG that replaces them is in `site/favicon/icon.svg`), and the two
 * PNG/ICO links are dropped rather than left pointing at a file that is not
 * there. The SVG link is made absolute so the icon resolves from any depth: the
 * capture writes it relative, which is why nested pages had no icon at all.
 */
function swapIcons(html: string): string {
  return html
    .replace(/<link[^>]+rel="(?:shortcut )?icon"[^>]*favicon\.ico[^>]*>/gi, '')
    .replace(/<link[^>]+rel="(?:shortcut )?icon"[^>]*icon-192\.png[^>]*>/gi, '')
    .replace(/<link[^>]+rel="apple-touch-icon"[^>]*>/gi, '')
    .replace(
      /(<link[^>]+rel="(?:shortcut )?icon"[^>]*href=")(?:[^"]*?\/)?favicon\/icon\.svg(")/gi,
      '$1/favicon/icon.svg$2',
    )
}

/**
 * Every page names the product in its title.
 *
 * The capture usually has no `<title>` element at all — the app it came from set
 * the title from a hydration payload, and the only `<title …>` tag in the file
 * sits inside that JSON. So this works on the head only, and falls back to
 * naming the page from its own path when there is nothing to rewrite.
 */
function titleFor(path: string): string {
  const page = path.replace(/^\/+|\.html$/g, '').replace(/\/index$/, '')
  if (!page || page === 'index') return 'ProdOps — product planning and UI design'
  const words = page
    .split(/[/-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  return `${words.join(' ')} — ProdOps`
}

function retitle(html: string, path: string): string {
  // Case-insensitive: the crawler's redirect stubs are written in upper case.
  const headEnd = html.toLowerCase().indexOf('</head>')
  if (headEnd === -1) return html
  const head = html.slice(0, headEnd)
  const rest = html.slice(headEnd)

  const found = head.match(/<title\b([^>]*)>([\s\S]*?)<\/title>/i)
  if (found) {
    const text = found[2].replace(/\s+/g, ' ').trim()
    const branded = /ProdOps/.test(text) ? text : `${text} — ProdOps`
    return head.replace(found[0], `<title>${branded}</title>`) + rest
  }

  // No title in the markup: add one, right after <head>.
  return head.replace(/<head\b[^>]*>/i, (tag) => `${tag}\n    <title>${titleFor(path)}</title>`) + rest
}

/**
 * The capture sizes its wordmark by width — 180px — because that logo was a
 * 6.6:1 lockup. The ProdOps lockup is a square mark plus a word, so the same
 * width would make it twice as tall and push the navigation out of alignment.
 * Sizing it by height instead keeps the header exactly the height it was, which
 * is the alignment the rest of the page is built on.
 *
 * Nothing here sets `display`: the header carries two copies of the wordmark,
 * an ink one and a light one, and the site hides whichever the current theme
 * does not need (`.hidden` / `.dark\:block`). A `display` declaration from this
 * sheet comes later than the site's own, which put both logos on screen.
 */
const BRAND_CSS = `<style id="prodops-brand">
  /* Height only. Setting display here would beat the site's own
     .hidden { display: none } — the light/dark pair — and show two logos.
     The ProdOps lockup is 320x96 with the mark in a 64px square, so 38px keeps
     the word at roughly the weight of the 16px nav links beside it and the
     lockup about as wide as the one it replaces; --nav-height is 84px. */
  .ds-wordmark { width: auto !important; height: 38px; vertical-align: middle; }
  footer .ds-wordmark, .ds-footer .ds-wordmark { height: 34px; }
  .ds-nav > a[aria-label], .ds-footer a[aria-label] { display: inline-flex; align-items: center; }
  /* The author portrait is a mark now, so it sits with the sign-off text. */
  .signoff > img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }

  /* ---- the workspace link and the theme switch -------------------------- */
  /* "Open ProdOps" is a nav action, not a floating button: the same 14px
     weight and radius as the links beside it, filled with the brand token so
     it is the one thing in the header that looks like a destination. */
  .ds-nav-actions { align-items: center; }
  .prodops-open {
    display: inline-flex; align-items: center; align-self: center;
    padding: 8px 14px; border-radius: var(--radius-control);
    background: var(--color-brand); color: var(--color-on-brand, #fff);
    font-size: 14px; font-weight: 600; line-height: 1.4; text-decoration: none;
    white-space: nowrap; transition: background var(--duration-fast, .18s) ease;
  }
  .prodops-open:hover, .prodops-open:focus-visible { background: var(--color-brand-hover); color: var(--color-on-brand, #fff); }
  .prodops-theme {
    display: inline-flex; align-items: center; justify-content: center;
    align-self: center; width: 36px; height: 36px; padding: 0; cursor: pointer;
    border: 1px solid var(--color-hairline); border-radius: 999px;
    background: transparent; color: var(--color-body);
    transition: color var(--duration-fast, .18s) ease, border-color var(--duration-fast, .18s) ease;
  }
  .prodops-theme:hover, .prodops-theme:focus-visible { color: var(--color-brand); border-color: var(--color-brand); }
  .prodops-theme svg { display: block; }
  .prodops-theme-moon { display: none; }
  .dark .prodops-theme-sun { display: none; }
  .dark .prodops-theme-moon { display: block; }
  /* Inside the mobile drawer the switch is a row like the links above it. */
  .prodops-theme-mobile {
    width: 100%; justify-content: flex-start; text-align: left;
    background: none; border: 0; cursor: pointer; font: inherit;
  }
  /* Dark mode has to keep the two wordmarks honest: the capture shows the ink
     one by default and the light one under .dark, which the utility classes
     already do — this only makes sure a switch that lands mid-paint cannot
     show both for a frame. */
  html.dark { color-scheme: dark; }

  /* ---- the founder's photograph ---------------------------------------- */
  /* The capture's portrait slot was a 40px circle showing a product mark. It
     now holds a photograph of a person at a desk, so the circle is a little
     larger and the image is cropped to the face rather than to the room. */
  .prodops-founder-photo {
    width: 64px; height: 64px; flex: 0 0 64px; display: inline-block;
    border-radius: 50%; overflow: hidden;
    border: 1px solid var(--color-hairline); background: var(--color-hairline);
  }
  .prodops-founder {
    width: 100%; height: 100%; display: block; object-fit: cover;
    transform: scale(2.7); transform-origin: 41% 24%;
  }
  .signoff { align-items: center; }
  .signoff .name { font-weight: 600; }

  /* ---- paying, in rand -------------------------------------------------- */
  .prodops-pay {
    margin-top: 16px; padding: 24px;
    border: 1px solid var(--color-hairline); border-radius: var(--radius-card);
    background: var(--color-surface);
    color: var(--color-body); font-size: 15px; line-height: 1.6;
  }
  .prodops-pay h3 { margin: 6px 0 8px; font-size: 20px; color: var(--color-display); letter-spacing: -.01em; }
  .prodops-pay h4 { margin: 22px 0 8px; font-size: 14px; color: var(--color-display); }
  .prodops-pay p { margin: 0 0 10px; }
  .prodops-pay .kicker { margin: 0; }
  .prodops-pay-lede { color: var(--color-muted); }
  .prodops-pay-steps { margin: 14px 0 4px; padding-left: 20px; }
  .prodops-pay-steps li { margin: 8px 0; }
  .prodops-pay code {
    font: 500 12.5px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 2px 6px; border-radius: 6px;
    background: color-mix(in srgb, var(--color-display) 8%, transparent);
    color: var(--color-display);
  }
  .prodops-pay-copy {
    margin-left: 6px; padding: 3px 9px; cursor: pointer;
    border: 1px solid var(--color-hairline); border-radius: 999px;
    background: transparent; color: var(--color-brand);
    font: 600 12px/1.4 inherit;
  }
  .prodops-pay-copy:hover { border-color: var(--color-brand); }
  .prodops-pay-eft { margin: 0; display: grid; gap: 8px; }
  .prodops-pay-eft > div { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--color-hairline); padding-bottom: 8px; }
  .prodops-pay-eft > div:last-child { border-bottom: 0; padding-bottom: 0; }
  .prodops-pay-eft dt { color: var(--color-muted); font-size: 14px; margin: 0; }
  .prodops-pay-eft dd { margin: 0; color: var(--color-display); font-size: 14px; text-align: right; }
  .prodops-tz { margin: 10px 0 0; }
  .prodops-pay-note {
    margin: 20px 0 0; padding-top: 14px; border-top: 1px solid var(--color-hairline);
    font-size: 13px; color: var(--color-muted);
  }
  @media (max-width: 640px) {
    .ds-wordmark { height: 32px; }
    .prodops-open { padding: 7px 11px; font-size: 13px; }
  }
</style>`

/**
 * The theme, before the first paint.
 *
 * `BRAND_CSS` is in the head, and so is this: a reader whose machine is in dark
 * mode should never see a white page flash and then go dark, which is exactly
 * what a switch that waits for `DOMContentLoaded` produces. It is four lines,
 * it reads the same key the runtime writes, and with no JavaScript at all the
 * pages stay in the light theme they were captured in.
 */
const THEME_BOOT = `<script id="prodops-theme-boot">
  (function () {
    try {
      var saved = localStorage.getItem('prodops-theme');
      var dark = saved ? saved === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (dark) document.documentElement.classList.add('dark');
    } catch (error) {}
  })();
</script>`

function bootTheme(html: string): string {
  if (html.includes('prodops-theme-boot')) return html
  return html.replace(/<head\b([^>]*)>/i, (tag: string) => `${tag}\n${THEME_BOOT}`)
}

/**
 * Apply a table to the text of a document, never to its tags.
 *
 * `agentcanon` is both a product name and a file name (`agentcanon.html`). A
 * blind rename turned the link into `Agents canon.html` — a broken link with a
 * space in it. Text nodes are renamed; attribute values, class names and paths
 * are left exactly as the capture wrote them.
 */
function renameProducts(html: string): string {
  const inText = (value: string) => {
    let next = value
    for (const [pattern, replacement] of PRODUCTS) next = next.replace(pattern, replacement)
    return next
  }
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_match, tag: string | undefined, text: string | undefined) => {
    if (text) return inText(text)
    // Inside a tag only the attributes that read as text are renamed: an
    // `href` is a path, and a path is not a product name.
    return (tag ?? '').replace(
      /(\s(?:alt|aria-label|title|content|placeholder|value)=)("[^"]*"|'[^']*')/gi,
      (_attr, name: string, quoted: string) => `${name}${quoted[0]}${inText(quoted.slice(1, -1))}${quoted[0]}`,
    )
  })
}

/** Put the brand stylesheet in the head, before anything paints. */
function withBrandCss(html: string): string {
  const withTheme = bootTheme(html)
  const at = withTheme.toLowerCase().indexOf('</head>')
  if (at === -1) return withTheme.replace(/<body\b[^>]*>/i, (tag) => `${tag}\n${BRAND_CSS}`)
  return withTheme.slice(0, at) + BRAND_CSS + '\n' + withTheme.slice(at)
}

export function rebrand(html: string, path = '/'): string {
  // Words first, then the handles they produced, and the logo swap last: the
  // replacement is a long base64 string, and running word replacements over it
  // would be replacing inside a data URI.
  // React's server renderer writes empty comments between adjacent text nodes,
  // so a sentence can be "Design OS<!-- --> runs". They are invisible, but they
  // stop a phrase match from seeing the sentence a reader sees, so they go
  // first and the rules see the same words the page will show.
  let out = html.replace(/<!--\s*-->/g, '')
  out = renameProducts(out)
  for (const [pattern, replacement] of PHRASES) out = out.replace(pattern, replacement)
  for (const [pattern, replacement] of HANDLES) out = out.replace(pattern, replacement)
  for (const [pattern, replacement] of CLEANUP) out = out.replace(pattern, replacement)
  return withBrandCss(retitle(swapIcons(swapLogos(out)), path))
}

/** For the checks: the strings that must not survive a rebrand. */
export const OLD_BRAND = /builder\s?methods|brian\s?casel|casjam|briancasel/i

/** For the checks: the old product names too, in the case they are written. */
export const OLD_PRODUCTS = /Agent OS|Design OS|Build New|agentcanon|bm-skills/
