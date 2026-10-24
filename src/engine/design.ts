import type { ColorRole, ColorStop, DesignOverrides, DesignSystem, Genome, TypographyRole } from '../types'
import type { Pack } from './packTypes'
import { contrastRatio, forceContrast, hexToHsl, hslToHex, mix, readableOn, tonalRamp, INK, PAPER } from './color'
import type { Rng } from './rng'

const TYPE_PAIRINGS: {
  id: string
  label: string
  display: string
  displayStack: string
  body: string
  bodyStack: string
  mono: string
  monoStack: string
  temperament: string
}[] = [
  {
    id: 'grotesk-dm',
    label: 'Space Grotesk + DM Sans',
    display: 'Space Grotesk',
    displayStack: "'Space Grotesk', 'Inter Tight', system-ui, sans-serif",
    body: 'DM Sans',
    bodyStack: "'DM Sans', system-ui, -apple-system, sans-serif",
    mono: 'JetBrains Mono',
    monoStack: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    temperament: 'modern, technical, a little editorial',
  },
  {
    id: 'serif-dm',
    label: 'Instrument Serif + DM Sans',
    display: 'Instrument Serif',
    displayStack: "'Instrument Serif', 'Times New Roman', Georgia, serif",
    body: 'DM Sans',
    bodyStack: "'DM Sans', system-ui, -apple-system, sans-serif",
    mono: 'JetBrains Mono',
    monoStack: "'JetBrains Mono', ui-monospace, monospace",
    temperament: 'considered, publishing, calm authority',
  },
  {
    id: 'fraunces-dm',
    label: 'Fraunces + DM Sans',
    display: 'Fraunces',
    displayStack: "'Fraunces', Georgia, serif",
    body: 'DM Sans',
    bodyStack: "'DM Sans', system-ui, -apple-system, sans-serif",
    mono: 'JetBrains Mono',
    monoStack: "'JetBrains Mono', ui-monospace, monospace",
    temperament: 'warm, characterful, human',
  },
  {
    id: 'grotesk-grotesk',
    label: 'Space Grotesk throughout',
    display: 'Space Grotesk',
    displayStack: "'Space Grotesk', system-ui, sans-serif",
    body: 'Space Grotesk',
    bodyStack: "'Space Grotesk', system-ui, sans-serif",
    mono: 'JetBrains Mono',
    monoStack: "'JetBrains Mono', ui-monospace, monospace",
    temperament: 'single-voice, utilitarian, precise',
  },
  {
    id: 'serif-fraunces',
    label: 'Instrument Serif + Fraunces body',
    display: 'Instrument Serif',
    displayStack: "'Instrument Serif', Georgia, serif",
    body: 'Fraunces',
    bodyStack: "'Fraunces', 'DM Sans', Georgia, serif",
    mono: 'JetBrains Mono',
    monoStack: "'JetBrains Mono', ui-monospace, monospace",
    temperament: 'warm editorial, magazine-adjacent',
  },
  {
    id: 'dm-dm',
    label: 'DM Sans + JetBrains Mono',
    display: 'DM Sans',
    displayStack: "'DM Sans', 'Inter Tight', system-ui, sans-serif",
    body: 'DM Sans',
    bodyStack: "'DM Sans', system-ui, sans-serif",
    mono: 'JetBrains Mono',
    monoStack: "'JetBrains Mono', ui-monospace, monospace",
    temperament: 'neutral, efficient, unreachable by fashion',
  },
]

const HUE_OFFSETS = [150, 172, 196, 38, 58, 210, 322, -140]

function buildRole(
  id: string,
  name: string,
  role: ColorRole['role'],
  hue: number,
  saturation: number,
  lightness: number,
  rationale: string,
): ColorRole {
  const ramp = tonalRamp(hue, saturation, lightness)
  const base = hslToHex({ h: hue, s: saturation, l: lightness })
  const stops: ColorStop[] = ramp.map((stop) => ({
    step: stop.step,
    hex: stop.hex,
    onWhite: contrastRatio(stop.hex, PAPER),
    onInk: contrastRatio(stop.hex, INK),
  }))
  return {
    id,
    name,
    role,
    hue,
    saturation,
    lightness,
    base,
    contrastText: readableOn(base),
    stops,
    rationale,
  }
}

export function compileDesign(
  pack: Pack,
  rng: Rng,
  genome: Genome,
  productName: string,
  overrides: DesignOverrides = {},
): DesignSystem {
  const px = genome
  const primaryHue = pack.hues[rng.int(0, pack.hues.length - 1)]
  const primarySat = Math.round(38 + px.expression * 0.34)
  const primaryLight = Math.round(Math.max(34, Math.min(52, 46 - px.contrast * 0.04)))
  const accentHue = (primaryHue + rng.pick(HUE_OFFSETS) + 360) % 360
  const accentSat = Math.round(Math.max(35, Math.min(88, primarySat + 8 + (px.expression - 50) * 0.2)))
  const neutralHue = px.warmth > 50 ? 32 : 222
  const neutralSat = Math.round(3 + (100 - px.contrast) * 0.05 + px.warmth * 0.02)

  let primary = buildRole(
    'primary',
    'Primary',
    'primary',
    primaryHue,
    primarySat,
    primaryLight,
    `Hue ${primaryHue}° pulled from the ${pack.category.toLowerCase()} reference set. Saturation rises with expression; lightness drops as contrast rises so the base always clears 4.5:1 with white text.`,
  )
  // Guarantee accessible primary: darken in HSL until it clears 4.6:1 on white.
  if (contrastRatio(primary.base, PAPER) < 4.5) {
    const hsl = hexToHsl(primary.base)
    primary.base = forceContrast(hsl, PAPER, 4.6, 'darker')
    primary.contrastText = PAPER
    primary.rationale += ' The base was darkened from the raw ramp value to guarantee 4.5:1 with white text.'
  }
  let accent = buildRole(
    'accent',
    'Accent',
    'accent',
    accentHue,
    accentSat,
    Math.round(Math.max(38, Math.min(62, 54 - px.contrast * 0.05))),
    `Complement-offset from primary so the two never compete; used only for emphasis, never for large surfaces.`,
  )

  /* ---- inline token edits -------------------------------------------------
     Hue and radius edits rebuild the ramps rather than patching final hexes,
     so contrast maths and the semantic layer stay authoritative. */
  const basePrimaryHue = primaryHue
  const accentOffset = (accentHue - basePrimaryHue + 360) % 360
  const nextPrimaryHue = typeof overrides.primaryHue === 'number' ? ((overrides.primaryHue % 360) + 360) % 360 : basePrimaryHue
  const nextAccentHue =
    typeof overrides.accentHue === 'number'
      ? ((overrides.accentHue % 360) + 360) % 360
      : (nextPrimaryHue + accentOffset) % 360

  if (nextPrimaryHue !== basePrimaryHue) {
    primary = buildRole(
      'primary',
      'Primary',
      'primary',
      nextPrimaryHue,
      primary.saturation,
      primary.lightness,
      `Hue ${nextPrimaryHue}° set in the token editor (compiled at ${basePrimaryHue}°). Saturation and lightness are unchanged, so contrast still holds.`,
    )
    if (contrastRatio(primary.base, PAPER) < 4.5) {
      primary.base = forceContrast(hexToHsl(primary.base), PAPER, 4.6, 'darker')
      primary.contrastText = PAPER
      primary.rationale += ' The base was darkened to keep 4.5:1 with white text.'
    }
  }
  if (nextAccentHue !== accentHue) {
    accent = buildRole(
      'accent',
      'Accent',
      'accent',
      nextAccentHue,
      accent.saturation,
      accent.lightness,
      `Accent re-derived at hue ${nextAccentHue}° from the primary edit, keeping the original ${accentOffset}° offset.`,
    )
  }
  const neutral = buildRole(
    'neutral',
    'Neutral',
    'neutral',
    neutralHue,
    neutralSat,
    Math.round(46 - px.contrast * 0.06),
    px.warmth > 50
      ? 'Warm neutral (red-yellow bias) — reads as paper rather than screen.'
      : 'Cool neutral (blue bias) — reads as instrument rather than paper.',
  )
  const success = buildRole('success', 'Success', 'success', 152, Math.min(70, primarySat), 40, 'Reserved for confirmed, closed or healthy states.')
  const warning = buildRole('warning', 'Warning', 'warning', 36, Math.min(88, primarySat + 6), 45, 'Used for thresholds and approaching deadlines.')
  const danger = buildRole('danger', 'Danger', 'danger', 3, Math.min(76, primarySat + 4), 44, 'Destructive actions and hard failures only.')
  const info = buildRole('info', 'Info', 'info', 212, Math.min(70, primarySat), 42, 'Neutral guidance and system messages.')

  const pairing = TYPE_PAIRINGS[rng.int(0, TYPE_PAIRINGS.length - 1)]
  const baseSize = 15 + Math.round((100 - px.density) / 100) * 2
  const ratio = 1.2 + (px.expression / 100) * 0.13
  const sizeAt = (step: number) => Math.round(baseSize * Math.pow(ratio, step))

  const typography: TypographyRole[] = [
    {
      role: 'display',
      family: pairing.display,
      stack: pairing.displayStack,
      weights: [400, 500, 600, 700],
      size: `${sizeAt(4)}px`,
      lineHeight: '1.02',
      tracking: px.expression > 55 ? '-0.035em' : '-0.02em',
      usage: 'Page titles, empty-state headlines, marketing surfaces. Never below 24px.',
    },
    {
      role: 'body',
      family: pairing.body,
      stack: pairing.bodyStack,
      weights: [400, 500, 600],
      size: `${baseSize}px`,
      lineHeight: px.density > 60 ? '1.5' : '1.6',
      tracking: '0',
      usage: 'Interface copy, labels, tables, forms. The default for everything readable.',
    },
    {
      role: 'mono',
      family: pairing.mono,
      stack: pairing.monoStack,
      weights: [400, 500],
      size: `${baseSize - 1}px`,
      lineHeight: '1.5',
      tracking: '0.01em',
      usage: 'IDs, references, money, timestamps and code. Tabular numbers everywhere.',
    },
  ]

  const scale = [
    { name: 'display', px: sizeAt(4), usage: 'Page title' },
    { name: 'h1', px: sizeAt(3), usage: 'Section title' },
    { name: 'h2', px: sizeAt(2), usage: 'Card group title' },
    { name: 'h3', px: sizeAt(1), usage: 'Card title' },
    { name: 'body', px: baseSize, usage: 'Default copy' },
    { name: 'small', px: baseSize - 2, usage: 'Secondary and meta' },
    { name: 'caption', px: 11, usage: 'Labels, overlines, status' },
  ]

  const radiusBase =
    typeof overrides.radius === 'number'
      ? Math.max(0, Math.min(20, Math.round(overrides.radius)))
      : Math.round(2 + (px.geometry / 100) * 14)
  const radii = {
    xs: Math.max(0, radiusBase - 2),
    sm: Math.max(0, radiusBase - 1),
    md: radiusBase,
    lg: radiusBase + 4,
    xl: radiusBase + 10,
    pill: 999,
  }
  const spacingBase = [
    { name: '3xs', px: 2 },
    { name: '2xs', px: 4 },
    { name: 'xs', px: 8 },
    { name: 'sm', px: 12 },
    { name: 'md', px: 16 },
    { name: 'lg', px: 24 },
    { name: 'xl', px: 32 },
    { name: '2xl', px: 48 },
    { name: '3xl', px: 72 },
  ]
  const spacingMult = typeof overrides.spacing === 'number' ? Math.max(0.8, Math.min(1.25, overrides.spacing)) : 1
  const spacing = spacingBase.map((s) => ({ name: s.name, px: Math.max(1, Math.round(s.px * spacingMult)) }))

  const compiledCardStyle: DesignSystem['layout']['cardStyle'] =
    px.contrast > 68 ? 'outlined' : px.expression > 66 ? 'elevated' : px.geometry > 70 ? 'glass' : 'flat'
  const compiledShell: DesignSystem['layout']['shell'] =
    px.density > 66 ? 'rail' : px.contrast > 70 ? 'topbar' : rng.chance(0.3) ? 'split' : 'sidebar'
  const cardStyle: DesignSystem['layout']['cardStyle'] = overrides.cardStyle ?? compiledCardStyle
  const shell: DesignSystem['layout']['shell'] = overrides.shell ?? compiledShell

  const shadows = {
    none: 'none',
    xs: '0 1px 2px rgba(16, 18, 27, 0.06)',
    sm: '0 1px 3px rgba(16, 18, 27, 0.08), 0 1px 2px rgba(16, 18, 27, 0.04)',
    md: '0 4px 12px rgba(16, 18, 27, 0.08), 0 2px 4px rgba(16, 18, 27, 0.04)',
    lg: '0 12px 32px rgba(16, 18, 27, 0.10), 0 4px 8px rgba(16, 18, 27, 0.04)',
    focus: `0 0 0 3px ${mix(primary.base, PAPER, 0.72)}`,
  }

  const motion = [
    { name: 'instant', duration: '80ms', easing: 'linear', usage: 'Hover and press feedback' },
    { name: 'fast', duration: px.expression > 60 ? '150ms' : '120ms', easing: 'cubic-bezier(0.2, 0, 0, 1)', usage: 'Menus, tooltips, chips' },
    { name: 'base', duration: px.expression > 60 ? '240ms' : '200ms', easing: 'cubic-bezier(0.2, 0, 0, 1)', usage: 'Panels, drawers, route transitions' },
    { name: 'slow', duration: '420ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', usage: 'Charts on first paint, onboarding' },
  ]

  const layoutNav = pack.sections.slice(0, 6).map((s) => s.name)

  const { light: semantic, dark: darkSemantic } = buildSemantic(primary, accent, neutral, success, warning, danger, info, px)
  const densityLabel = densityFor(px.density)

  const tokensCss = buildTokensCss(semantic, darkSemantic, typography, radii, spacing, shadows, motion, primary, accent, neutral)
  const tailwindTheme = buildTailwind(semantic, typography, radii, primary, accent, neutral)
  const tokensJson = JSON.stringify(
    {
      $schema: 'lula-devzign/design-tokens@1',
      meta: { product: productName, archetype: pack.id, generatedBy: 'Lula DevZign', deterministic: true },
      color: Object.fromEntries(
        [primary, accent, neutral, success, warning, danger, info].map((c) => [
          c.id,
          { base: c.base, on: c.contrastText, ramp: Object.fromEntries(c.stops.map((s) => [s.step, s.hex])) },
        ]),
      ),
      semantic,
      dark: darkSemantic,
      typography: typography.map((t) => ({ role: t.role, family: t.family, sizes: { base: t.size, lineHeight: t.lineHeight, tracking: t.tracking } })),
      radius: radii,
      spacing,
      shadow: shadows,
      motion,
      layout: { shell, nav: layoutNav, cardStyle, density: densityLabel },
    },
    null,
    2,
  )

  return {
    name: `${productName} Design System`,
    mood: [...pack.moodWords, px.contrast > 65 ? 'high-contrast' : 'soft-contrast', densityLabel].slice(0, 4),
    rationale:
      `${pairing.label} — ${pairing.temperament}. ${densityLabel} density with a ${px.warmth > 55 ? 'warm' : 'cool'} neutral and ` +
      `${primarySat}% primary saturation. Radii at ${radiusBase}px, cards ${cardStyle}. Every value below is generated from the genome, so changing one dial re-derives the whole system rather than patching it.` +
      (Object.keys(overrides).length ? ` Edited in the token editor: ${Object.entries(overrides).map(([k, v]) => `${k} ${v}`).join(', ')}.` : ''),
    colors: [primary, accent, neutral, success, warning, danger, info],
    semantic,
    darkSemantic,
    typography,
    scale,
    radii,
    spacing,
    shadows,
    motion,
    layout: {
      shell,
      nav: layoutNav,
      contentWidth: px.density > 66 ? 1120 : 1280,
      cardStyle,
      density: densityLabel,
      grid: px.density > 66 ? '12 columns · 16px gutters · 1120px max' : '12 columns · 24px gutters · 1280px max',
    },
    components: [
      'Button (primary / secondary / ghost / destructive)',
      'Input, Select, Combobox with validation states',
      'Data table with sticky header and bulk selection',
      'Card, KPI tile and empty state',
      'Badge and status pill',
      'Drawer for record detail',
      'Tabs and segmented control',
      'Toast and inline banner',
      'Filter bar with saved views',
      'Chart primitives (bar, line, donut)',
    ],
    tokensCss,
    tailwindTheme,
    tokensJson,
  }
}

function densityFor(density: number): 'airy' | 'balanced' | 'compact' {
  return density < 40 ? 'airy' : density < 68 ? 'balanced' : 'compact'
}

function buildSemantic(
  primary: ColorRole,
  accent: ColorRole,
  neutral: ColorRole,
  success: ColorRole,
  warning: ColorRole,
  danger: ColorRole,
  info: ColorRole,
  px: Genome,
): { light: Record<string, string>; dark: Record<string, string> } {
  const n = (step: number) => neutral.stops.find((s) => s.step === step)?.hex ?? neutral.base
  const warmBg = px.warmth > 55
  const bg = warmBg ? mix(n(50), '#fffaf3', 0.55) : mix(n(50), '#f7f9fc', 0.6)
  const surface = '#ffffff'
  const surfaceRaised = warmBg ? mix(n(50), '#ffffff', 0.7) : mix(n(50), '#ffffff', 0.75)
  const pickReadable = (candidates: string[], target: number) =>
    candidates.find((c) => contrastRatio(c, bg) >= target) ?? candidates[candidates.length - 1]
  const muted = pickReadable([n(600), n(700), n(800)], 4.6)
  const faint = pickReadable([n(500), n(600), n(700)], 3.2)
  const light: Record<string, string> = {
    '--bg': bg,
    '--surface': surface,
    '--surface-2': n(100),
    '--surface-3': n(200),
    '--border': n(200),
    '--border-strong': n(300),
    '--ink': n(950),
    '--ink-2': n(700),
    '--ink-muted': muted,
    '--ink-faint': faint,
    '--primary': primary.base,
    '--on-primary': primary.contrastText,
    '--primary-soft': mix(primary.base, '#ffffff', 0.9),
    '--primary-hover': mix(primary.base, '#000000', 0.12),
    '--accent': accent.base,
    '--on-accent': accent.contrastText,
    '--accent-soft': mix(accent.base, '#ffffff', 0.88),
    '--success': success.base,
    '--success-soft': mix(success.base, '#ffffff', 0.88),
    '--warning': warning.base,
    '--warning-soft': mix(warning.base, '#ffffff', 0.86),
    '--danger': danger.base,
    '--danger-soft': mix(danger.base, '#ffffff', 0.88),
    '--info': info.base,
    '--info-soft': mix(info.base, '#ffffff', 0.88),
    '--focus-ring': mix(primary.base, '#ffffff', 0.55),
    '--shadow-color': '16 18 27',
    '--ink-inverse': n(50),
    '--scrim': 'rgba(12, 14, 20, 0.45)',
    '--surface-raised': surfaceRaised,
  }
  const dark: Record<string, string> = {
    '--bg': mix(n(950), '#08090c', 0.5),
    '--surface': n(950),
    '--surface-2': n(900),
    '--surface-3': n(800),
    '--surface-raised': n(900),
    '--border': n(800),
    '--border-strong': n(700),
    '--ink': n(50),
    '--ink-2': n(200),
    '--ink-muted': n(300),
    '--ink-faint': n(400),
    '--ink-inverse': n(950),
    '--primary': mix(primary.base, '#ffffff', 0.22),
    '--primary-soft': mix(primary.base, '#0b0c10', 0.72),
    '--primary-hover': mix(primary.base, '#ffffff', 0.34),
    '--on-primary': readableOn(mix(primary.base, '#ffffff', 0.22)),
    '--accent': mix(accent.base, '#ffffff', 0.2),
    '--accent-soft': mix(accent.base, '#0b0c10', 0.74),
    '--success-soft': mix(success.base, '#0b0c10', 0.76),
    '--warning-soft': mix(warning.base, '#0b0c10', 0.76),
    '--danger-soft': mix(danger.base, '#0b0c10', 0.76),
    '--info-soft': mix(info.base, '#0b0c10', 0.76),
    '--focus-ring': mix(primary.base, '#ffffff', 0.4),
    '--scrim': 'rgba(4, 5, 8, 0.66)',
  }
  return { light, dark }
}

function buildTokensCss(
  semantic: Record<string, string>,
  darkSemantic: Record<string, string>,
  typography: TypographyRole[],
  radii: Record<string, number>,
  spacing: { name: string; px: number }[],
  shadows: Record<string, string>,
  motion: { name: string; duration: string; easing: string }[],
  primary: ColorRole,
  accent: ColorRole,
  neutral: ColorRole,
): string {
  const light = Object.entries(semantic)
  const dark = Object.entries(darkSemantic)
  const lines: string[] = [
    '/* Lula DevZign — generated tokens. Do not hand-edit; re-generate instead. */',
    ':root {',
    '  /* Color */',
    ...light.map(([k, v]) => `  ${k}: ${v};`),
  ]
  for (const c of [primary, accent, neutral]) {
    for (const stop of c.stops) lines.push(`  --${c.id}-${stop.step}: ${stop.hex};`)
  }
  lines.push('', '  /* Type */')
  for (const t of typography) {
    lines.push(`  --font-${t.role}: ${t.stack};`)
    lines.push(`  --text-${t.role}: ${t.size};`)
    lines.push(`  --leading-${t.role}: ${t.lineHeight};`)
    lines.push(`  --tracking-${t.role}: ${t.tracking};`)
  }
  lines.push('', '  /* Radius */')
  for (const [k, v] of Object.entries(radii)) lines.push(`  --radius-${k}: ${k === 'pill' ? '999px' : `${v}px`};`)
  lines.push('', '  /* Space */')
  for (const s of spacing) lines.push(`  --space-${s.name}: ${s.px}px;`)
  lines.push('', '  /* Elevation */')
  for (const [k, v] of Object.entries(shadows)) lines.push(`  --shadow-${k}: ${v};`)
  lines.push('', '  /* Motion */')
  for (const m of motion) lines.push(`  --duration-${m.name}: ${m.duration};`)
  lines.push('}', '', '[data-theme="dark"] {')
  for (const [k, v] of dark) lines.push(`  ${k}: ${v};`)
  lines.push('}', '')
  return lines.join('\n')
}

function buildTailwind(
  semantic: Record<string, string>,
  typography: TypographyRole[],
  radii: Record<string, number>,
  primary: ColorRole,
  accent: ColorRole,
  neutral: ColorRole,
): string {
  const lines: string[] = ['@import "tailwindcss";', '', '@theme {']
  lines.push(`  --font-display: ${typography[0].stack};`)
  lines.push(`  --font-sans: ${typography[1].stack};`)
  lines.push(`  --font-mono: ${typography[2].stack};`)
  lines.push(`  --color-canvas: ${semantic['--bg']};`)
  lines.push(`  --color-surface: ${semantic['--surface']};`)
  lines.push(`  --color-ink: ${semantic['--ink']};`)
  lines.push(`  --color-muted: ${semantic['--ink-muted']};`)
  lines.push(`  --color-line: ${semantic['--border']};`)
  lines.push(`  --color-brand: ${primary.base};`)
  lines.push(`  --color-accent: ${accent.base};`)
  for (const c of [primary, accent, neutral]) {
    for (const stop of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      const s = c.stops.find((x) => x.step === stop)
      if (s) lines.push(`  --color-${c.id}-${stop}: ${s.hex};`)
    }
  }
  for (const [k, v] of Object.entries(radii)) lines.push(`  --radius-${k}: ${k === 'pill' ? '999px' : `${v}px`};`)
  lines.push('}')
  return lines.join('\n')
}
