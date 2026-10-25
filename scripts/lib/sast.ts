/**
 * South African time, and the way dates are written here.
 *
 * The captured pages are written for a New York audience: every session says
 * "2:00 PM ET", and every date is "November 3, 2026". ProdOps is built in
 * Johannesburg, so the served copy says "21:00 SAST" and "3 November 2026".
 *
 * The conversion is computed, not guessed. Eastern Time is UTC−5, except during
 * American daylight saving (second Sunday in March to the first Sunday in
 * November), when it is UTC−4. South African Standard Time is UTC+2 all year,
 * with no daylight saving — so a session is six hours ahead of ET in the
 * American summer and seven hours ahead in the American winter. That is why
 * 2:00 PM ET is 20:00 SAST in April and 21:00 SAST in November, and why a
 * blanket "+6 hours" would be wrong for half the calendar.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** The nth Sunday of a month, as a day of the month (1-based). */
function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const firstSunday = first === 0 ? 1 : 8 - first
  return firstSunday + (n - 1) * 7
}

/**
 * Is this date inside American daylight saving time?
 *
 * Only the year of the date matters: the rule has been stable since 2007, and
 * the capture's sessions are all in 2026. Comparing UTC day numbers keeps the
 * answer away from the host machine's own timezone.
 */
export function isAmericanDst(year: number, month: number, day: number): boolean {
  const at = Date.UTC(year, month, day)
  const starts = Date.UTC(year, 2, nthSunday(year, 2, 2))
  const ends = Date.UTC(year, 10, nthSunday(year, 10, 1))
  return at >= starts && at < ends
}

/** "November 3, 2026" → the same instant, or null if it is not that shape. */
function parseLongDate(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})$/)
  if (!match) return null
  const month = MONTHS.indexOf(match[1])
  if (month === -1) return null
  return { year: Number(match[3]), month, day: Number(match[2]) }
}

/** The offset between Eastern Time and SAST, in hours, for a given instant. */
function hoursAhead(year: number, month: number, day: number): number {
  return isAmericanDst(year, month, day) ? 6 : 7
}

/**
 * A 12-hour Eastern Time written as 24-hour South African time.
 *
 * `date` is the session's own date, because the answer depends on it: the same
 * clock time in ET is an hour different in SAST depending on the time of year.
 * Without a date the summer offset is used, which is the commoner case and the
 * one the capture's own sessions are in.
 */
export function toSast(time: string, date?: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*([AP])M(?:\s*ET)?$/i)
  if (!match) return time
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'P') hour += 12
  const minutes = Number(match[2])
  const parsed = date ? parseLongDate(date) : null
  const ahead = parsed ? hoursAhead(parsed.year, parsed.month, parsed.day) : 6
  const shifted = (hour + ahead) % 24
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(shifted)}:${pad(minutes)} SAST`
}

/** "November 3, 2026" → "3 November 2026", the way a South African writes it. */
export function toSaDate(value: string): string {
  const parsed = parseLongDate(value)
  if (!parsed) return value
  return `${parsed.day} ${MONTHS[parsed.month]} ${parsed.year}`
}

/**
 * An absolute instant, written in South African time.
 *
 * A session detail page says when it is in three zones at once — "Dec 10th,
 * 2026 @ 11am PT / 2pm ET / 7pm GMT" — inside a `<time datetime=…>`. Nobody
 * reading this site needs two of those, so the element is rewritten to the one
 * that matters, computed from the ISO instant rather than from the prose, which
 * is the only value that cannot be wrong.
 */
export function sastFromIso(iso: string): { date: string; time: string } | null {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  // +02:00, all year, no daylight saving in South Africa.
  const shifted = new Date(at.getTime() + 2 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${shifted.getUTCDate()} ${MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())} SAST`,
  }
}

/** "Nov 3" → "3 Nov". */
export function toSaShortDate(value: string): string {
  const match = value.match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/)
  return match ? `${match[2]} ${match[1]}` : value
}

/**
 * Rewrite a served page into South African time.
 *
 * Three shapes appear in the capture, and each is rewritten where it lives:
 *
 * 1. the listing's meta line — `November 3, 2026 · 2:00 PM ET`;
 * 2. a bare time next to a session it belongs to;
 * 3. a long American date anywhere else, including inside JSON-LD.
 *
 * The time is converted against its own date whenever one is on the same line
 * or in the same JSON object, and against the summer offset when it is not.
 */
export function southAfricanTime(html: string): string {
  let out = html

  // 1. `<time>November 3, 2026 · 2:00 PM ET</time>` and its plain-text twins.
  out = out.replace(
    /\b([A-Z][a-z]+ \d{1,2}, \d{4})(\s*(?:·|&middot;|-|–)\s*)(\d{1,2}:\d{2} [AP]M ET)\b/g,
    (_match, date: string, separator: string, time: string) => `${toSaDate(date)}${separator}${toSast(time, date)}`,
  )

  // 2. The props JSON (a few pages keep it) pairs a date with its time; each
  //    time is converted against the date that precedes it in the same object.
  //    (The HTML-escaped copy inside an attribute is handled by rules 3 and 4:
  //    a page that still carries its props is a page whose dates and times are
  //    plain text as far as these patterns are concerned.)
  out = out.replace(
    /("date":"([A-Z][a-z]+ \d{1,2}, \d{4})"[^}]*?"time":")(\d{1,2}:\d{2} [AP]M ET)(")/g,
    (_match, before: string, date: string, time: string, after: string) =>
      `${before}${toSast(time, date)}${after}`,
  )
  // 2b. A `time` element states the instant in three zones; keep the one that
  //    applies here, computed from the attribute.
  out = out.replace(
    /<time([^>]*\bdateTime="[^"]*"|\bdatetime="[^"]*")[^>]*>([\s\S]*?)<\/time>/g,
    (match: string, _attr: string, inner: string) => {
      // A season label ("Fall '26") or a bare date is not a time of day.
      if (!/@|\d{1,2}(am|pm|:\d{2})/i.test(inner) && !/\d@/.test(inner)) {
        return match.replace(inner, inner.replace(/\b([A-Z][a-z]+) (\d{1,2}), (\d{4})\b/g, (_m, month: string, day: string, year: string) => `${day} ${month} ${year}`))
      }
      const iso = match.match(/(?:dateTime|datetime)="([^"]+)"/i)
      const sast = iso ? sastFromIso(iso[1]) : null
      if (!sast) return match
      return match.replace(inner, `${sast.date} @ ${sast.time}`)
    },
  )

  // 3. A time with no date beside it: the summer offset, which is the one the
  //    capture's own sessions run on.
  out = out.replace(/\b(\d{1,2}:\d{2} [AP]M ET)\b/g, (time: string) => toSast(time))

  // 4. The dates themselves, after the times have used them.
  out = out.replace(/\b([A-Z][a-z]+) (\d{1,2}), (\d{4})\b/g, (_match, month: string, day: string, year: string) =>
    MONTHS.includes(month) ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`,
  )
  // `"short_date":"Nov 3"` and the listing label that shows it.
  out = out.replace(/"short_date":"([A-Z][a-z]{2} \d{1,2})"/g, (_match, value: string) => `"short_date":"${toSaShortDate(value)}"`)
  out = out.replace(
    /(<span class="ds-listing-label">)([A-Z][a-z]{2} \d{1,2})(<\/span>)/g,
    (_match, before: string, value: string, after: string) => `${before}${toSaShortDate(value)}${after}`,
  )

  return out
}
