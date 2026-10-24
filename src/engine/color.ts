/** Color math used by the design-system compiler. Pure functions, no deps. */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hh = ((h % 360) + 360) % 360
  const ss = clamp(s, 0, 100) / 100
  const ll = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ll - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hh < 60) [r, g, b] = [c, x, 0]
  else if (hh < 120) [r, g, b] = [x, c, 0]
  else if (hh < 180) [r, g, b] = [0, c, x]
  else if (hh < 240) [r, g, b] = [0, x, c]
  else if (hh < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h *= 60
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function srgb(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const light = Math.max(la, lb)
  const dark = Math.min(la, lb)
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2))
}

export const INK = '#12121a'
export const PAPER = '#ffffff'

export function readableOn(hex: string): string {
  return contrastRatio(hex, PAPER) >= contrastRatio(hex, INK) ? PAPER : INK
}

/** Best readable ink for a background, but respects a brand-light aesthetic. */
export function bestTextOn(hex: string): '#ffffff' | '#12121a' {
  return contrastRatio(hex, INK) >= contrastRatio(hex, PAPER) ? INK : PAPER
}

export function mix(a: string, b: string, amount: number): string {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  const t = clamp(amount, 0, 1)
  return hslToHex(hexToHsl(
    '#' +
      [ra.r, ra.g, ra.b]
        .map((v, i) => {
          const other = i === 0 ? rb.r : i === 1 ? rb.g : rb.b
          return Math.round(v + (other - v) * t)
            .toString(16)
            .padStart(2, '0')
        })
        .join(''),
  ))
}

export function alpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** A 50→950 tonal ramp around a brand hue. */
export function tonalRamp(h: number, s: number, l: number): { step: number; hex: string }[] {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  const lightnessMap: Record<number, number> = {
    50: 97,
    100: 94,
    200: 87,
    300: 78,
    400: 66,
    500: 54,
    600: 45,
    700: 37,
    800: 29,
    900: 22,
    950: 14,
  }
  return steps.map((step) => {
    const target = lightnessMap[step]
    const satFactor = step <= 100 ? 0.7 : step >= 900 ? 0.9 : 1
    return {
      step,
      hex: hslToHex({ h, s: clamp(s * satFactor, 0, 100), l: step === 500 ? l : target }),
    }
  })
}

/** Snap to a hex that hits a target contrast against a background, same hue. */
export function forceContrast(
  { h, s, l }: Hsl,
  against: string,
  target: number,
  direction: 'darker' | 'lighter',
): string {
  let lo = direction === 'darker' ? 0 : l
  let hi = direction === 'darker' ? l : 100
  let best = hslToHex({ h, s, l })
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2
    const hex = hslToHex({ h, s, l: mid })
    const ratio = contrastRatio(hex, against)
    if (ratio >= target) {
      best = hex
      if (direction === 'darker') lo = mid
      else hi = mid
    } else if (direction === 'darker') {
      hi = mid
    } else {
      lo = mid
    }
  }
  return best
}
