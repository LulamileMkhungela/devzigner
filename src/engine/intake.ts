/**
 * Reading the builder's own description.
 *
 * ProdOps starts with a question — what is this product for, and who is it
 * for — and a model answers it. Here nothing calls a model, so the description
 * has to be read by rules, and every rule has to be visible in the output: the
 * archetype it picks, the words it keeps, the name it builds.
 *
 * The profiler is intentionally boring and inspectable. It scores the text
 * against the twelve archetypes' vocabularies, lifts the actor and the object
 * the sentence is about, and hands those to the brief compiler. Same text in,
 * same reading out — which is what makes the package reproducible.
 */
import { makeRng, hashString } from './rng'

export interface Intake {
  /** Best-matching archetype, or empty when the text says nothing useful. */
  archetypeId: string
  /** Evidence for the choice, so the UI can show why. */
  matched: string[]
  /** The first sentence, cleaned, as the builder wrote it. */
  sentence: string
  /** What the product is for: "mobile dog groomers", "clinic front desk". */
  actor: string
  /** The plural thing the product works on: "bookings", "invoices". */
  object: string
  /** A product name derived from the text, or empty when it cannot read one. */
  name: string
  /** True when the text was long enough to be read at all. */
  used: boolean
}

/** Each archetype's vocabulary. Multi-word cues score higher than single ones. */
const CUES: { id: string; words: string[]; phrases?: string[] }[] = [
  {
    id: 'marketplace',
    words: ['marketplace', 'market', 'sellers', 'seller', 'vendors', 'vendor', 'buyers', 'buyer', 'listing', 'listings', 'escrow', 'artisans', 'shop', 'storefront', 'goods', 'wholesale', 'bazaar'],
    phrases: ['sell directly', 'two-sided', 'supply and demand'],
  },
  {
    id: 'saas',
    words: ['saas', 'subscription', 'subscriptions', 'workspace', 'seats', 'b2b', 'teams', 'plans', 'trial', 'usage', 'tenants', 'api keys', 'approvals', 'approval', 'workflow', 'workflows', 'requests', 'tickets queue'],
    phrases: ['self-serve', 'per seat', 'product-led'],
  },
  {
    id: 'crm',
    words: ['leads', 'lead', 'pipeline', 'deals', 'deal', 'prospects', 'prospect', 'sales', 'crm', 'follow-up', 'followups', 'outreach', 'quotations', 'quotes'],
    phrases: ['sales pipeline', 'follow up', 'close rate'],
  },
  {
    id: 'learning',
    words: ['students', 'student', 'learners', 'learner', 'courses', 'course', 'lessons', 'lesson', 'teachers', 'teacher', 'tutor', 'school', 'curriculum', 'assignments', 'grades', 'quiz'],
    phrases: ['online course', 'class roster'],
  },
  {
    id: 'clinic',
    words: ['patients', 'patient', 'clinic', 'appointments', 'appointment', 'doctors', 'doctor', 'nurses', 'nurse', 'dental', 'medical', 'therapy', 'therapist', 'consultations', 'consultation', 'prescriptions', 'triage', 'vitals', 'practice', 'bookings', 'booking', 'reservations', 'reservation', 'slots', 'slot', 'schedule', 'diary'],
    phrases: ['front desk', 'patient records', 'medical records'],
  },
  {
    id: 'fintech',
    words: ['payments', 'payment', 'invoices', 'invoice', 'loans', 'loan', 'wallet', 'banking', 'reconciliation', 'payouts', 'payout', 'refunds', 'interest', 'credit', 'ledger', 'billing', 'statements', 'settlement'],
    phrases: ['take payment', 'payment on arrival', 'money movement'],
  },
  {
    id: 'logistics',
    words: ['deliveries', 'delivery', 'drivers', 'driver', 'routes', 'route', 'fleet', 'courier', 'shipments', 'shipment', 'warehouse', 'tracking', 'dispatch', 'parcels', 'bins', 'collections'],
    phrases: ['day route', 'on the road', 'last mile'],
  },
  {
    id: 'creator',
    words: ['creators', 'creator', 'fans', 'content', 'posts', 'post', 'newsletter', 'subscribers', 'subscriber', 'podcast', 'portfolio', 'followers', 'audience', 'drafts', 'commissions'],
    phrases: ['paid subscribers', 'content calendar'],
  },
  {
    id: 'property',
    words: ['properties', 'property', 'tenants', 'tenant', 'landlords', 'landlord', 'rentals', 'rental', 'leases', 'lease', 'units', 'unit', 'buildings', 'building', 'maintenance', 'estate', 'occupancy'],
    phrases: ['rent roll', 'lease renewal'],
  },
  {
    id: 'fieldops',
    words: ['technicians', 'technician', 'installers', 'installer', 'crew', 'crews', 'jobs', 'job', 'works orders', 'work order', 'work orders', 'on-site', 'onsite', 'servicing', 'inspection', 'inspections', 'groomer', 'groomers', 'plumber', 'electrician', 'mobile'],
    phrases: ['service call', 'day sheet', 'call-out'],
  },
  {
    id: 'peopleops',
    words: ['hiring', 'hire', 'employees', 'employee', 'onboarding', 'hr', 'payroll', 'leave', 'shifts', 'shift', 'rosters', 'roster', 'staff', 'recruits', 'candidates', 'candidate', 'appraisals', 'volunteers', 'volunteer', 'timesheets'],
    phrases: ['time off', 'performance review', 'volunteer shifts'],
  },
  {
    id: 'events',
    words: ['events', 'event', 'tickets', 'ticket', 'attendees', 'attendee', 'venues', 'venue', 'conference', 'agenda', 'sessions', 'session', 'speakers', 'speaker'],
    phrases: ['ticket sales', 'door list', 'run sheet'],
  },
]

const STOP = new Set([
  'a', 'an', 'the', 'for', 'with', 'that', 'this', 'and', 'or', 'to', 'of', 'in', 'on', 'so', 'it', 'is', 'are',
  'be', 'by', 'from', 'at', 'my', 'our', 'their', 'we', 'i', 'you', 'they', 'who', 'whom', 'when', 'where', 'what',
  'tool', 'app', 'application', 'platform', 'system', 'software', 'site', 'website', 'product', 'solution', 'service',
  'want', 'need', 'build', 'make', 'create', 'help', 'helps', 'lets', 'let', 'where', 'which', 'every', 'each', 'all',
  'small', 'local', 'simple', 'internal', 'better', 'new', 'own', 'users', 'user', 'people', 'person', 'someone',
  'one', 'two', 'three', 'something', 'thing', 'things', 'way', 'ways', 'must', 'should', 'can', 'will', 'up',
  'across', 'along', 'behind', 'beside', 'beyond', 'plus', 'versus', 'always', 'perhaps', 'less', 'unless',
  'whereas', 'ours', 'yours', 'theirs', 'hers', 'ourselves', 'themselves', 'does', 'goes', 'has', 'was', 'is', 'as',
])

/** Words a name can be built from are concrete nouns, not verbs or filler. */
const NAME_SUFFIXES = ['Desk', 'Works', 'Line', 'Base', 'Flow']

/** Words that are never a business: a product, an org's own shell, or filler. */
const GENERIC = new Set([
  'tool', 'app', 'application', 'platform', 'system', 'marketplace', 'software', 'product', 'company', 'business',
  'team', 'teams', 'people', 'person', 'users', 'user', 'owners', 'owner', 'staff', 'bank', 'shop', 'store',
  'scheduling', 'management', 'admin', 'internal', 'external', 'their', 'your', 'its', 'customers', 'customer',
])

/** Cue words that name people rather than records. */
const PEOPLE = new Set([
  'sellers', 'seller', 'buyers', 'buyer', 'vendors', 'vendor', 'artisans', 'students', 'student', 'learners',
  'learner', 'teachers', 'teacher', 'patients', 'patient', 'doctors', 'doctor', 'nurses', 'nurse', 'therapists',
  'drivers', 'driver', 'creators', 'creator', 'fans', 'subscribers', 'subscriber', 'followers', 'tenants', 'tenant',
  'landlords', 'landlord', 'technicians', 'technician', 'installers', 'installer', 'crews', 'crew', 'groomers',
  'groomer', 'plumber', 'electrician', 'employees', 'employee', 'staff', 'recruits', 'candidates', 'candidate',
  'attendees', 'attendee', 'teams', 'tenants', 'users', 'volunteers', 'volunteer',
])

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function firstSentence(text: string): string {
  const sentence = sentences(text)[0] ?? text.trim()
  return sentence.length > 220 ? `${sentence.slice(0, 217).trimEnd()}…` : sentence
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function singular(word: string): string {
  if (word.length < 4) return word
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`
  if (/(?:ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2)
  if (/[^s]s$/.test(word)) return word.slice(0, -1)
  return word
}

function titleCase(text: string): string {
  return text.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

/**
 * The actor is the person or business the sentence says the product is for:
 * the noun phrase after "for", or the subject the sentence opens with before
 * "that"/"which"/"who". A record noun ("patients", "invoices") is never the
 * actor — those are what the product moves, not who it serves.
 */
function findActor(text: string, recordWords: Set<string>): string {
  const clean = (phrase: string) =>
    phrase
      .split(/\b(?:who|that|which|to|so|with|when|where|and|at|in|on|from|by|across|within)\b/i)[0]
      .replace(/[.,;:!?].*$/, '')
      .replace(/^(?:an?|the)\s+/i, '')
      .trim()

  const forPhrase = text.match(/\b(?:for|helps?|lets?|serves?|used by|built for)\s+([a-z0-9' -]{3,48})/i)
  if (forPhrase) {
    const kept = clean(forPhrase[1])
      .split(/\s+/)
      .filter(
        (word) =>
          !GENERIC.has(word.toLowerCase()) &&
          (!STOP.has(word.toLowerCase()) || ['mobile', 'local', 'small', 'rural'].includes(word.toLowerCase())),
      )
      .slice(0, 3)
    const namesPeople = kept.some((word) => PEOPLE.has(word.toLowerCase()))
    if (kept.length && (namesPeople || !kept.every((word) => recordWords.has(word.toLowerCase())))) return kept.join(' ')
  }

  const productNoun = headNoun(text)
  const subject = clean(text)
    .split(/\s+/)
    .filter((word) => !STOP.has(word.toLowerCase()))
    .slice(0, 3)
  const concrete = subject.filter((word) => !GENERIC.has(word.toLowerCase()))
  const insideProductNoun =
    Boolean(productNoun) && subject.every((word) => words(productNoun).includes(word.toLowerCase()))
  if (concrete.length && !insideProductNoun && !concrete.every((word) => recordWords.has(word.toLowerCase()))) {
    return concrete.join(' ')
  }
  return ''
}

/** The object is what the product moves around: bookings, invoices, jobs. */
function findObject(text: string, actor: string, hits: string[], recordWords: Set<string>): string {
  const actorWords = new Set(words(actor))
  const lower = words(text)
  const fromCues = hits.find((word) => recordWords.has(word) && /s$/.test(word) && !actorWords.has(word))
  if (fromCues) return fromCues
  return lower.find((word) => recordWords.has(word) && /s$/.test(word) && !actorWords.has(word)) ?? ''
}

/** The noun the described artefact is: "a booking tool" → booking. */
function headNoun(text: string): string {
  const match = text.match(
    /\b([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})\s+(?:tool|app|application|platform|system|dashboard|portal|marketplace|tracker|scheduler|workspace|site|website|software)\b/i,
  )
  return match ? match[1].toLowerCase() : ''
}

/** "Booking Desk", "Groomer Works" — derived, never invented from nothing. */
function nameFrom(actor: string, object: string, text: string, seed: number): string {
  const rng = makeRng(hashString(`intake-name:${seed}`))
  const concrete = (list: string[]) =>
    list.filter((word) => !STOP.has(word) && !GENERIC.has(word) && word.length > 3)
  const actorWords = concrete(words(actor))
  const objectWords = concrete(words(object))
  // No actor and no object means nothing worth naming: the archetype's stock
  // name is more honest than a noun scraped from the adverbs.
  // The business itself is the last concrete word: "mobile dog groomers" → groomer.
  const stemWord = actorWords[actorWords.length - 1] ?? objectWords[0]
  if (!stemWord) return ''
  const stem = titleCase(singular(stemWord))
  if (!/^[A-Za-z]{3,12}$/.test(stem)) return ''
  // A name that repeats the archetype's own word adds nothing.
  if (/^(Booking|Payment|Listing|Appointment|Event)$/.test(stem)) {
    const head = words(text).find((word) => !STOP.has(word) && /^[a-z]{4,9}$/.test(word) && !/^(tool|app)$/.test(word))
    if (!head) return ''
    return `${titleCase(singular(head))} ${rng.pick(NAME_SUFFIXES)}`
  }
  return `${stem} ${rng.pick(NAME_SUFFIXES)}`
}

/**
 * The builder's sentence, ready to sit in prose: first letter capitalised and
 * closed with a full stop. Descriptions are typed, not written to a spec, so
 * "a booking tool for groomers" must not glue itself to the next sentence.
 */
export function asSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
}

export function profileIdea(idea: string): Intake {
  const text = idea.replace(/\s+/g, ' ').trim()
  const blank: Intake = { archetypeId: '', matched: [], sentence: '', actor: '', object: '', name: '', used: false }
  if (text.length < 12) return blank

  const lower = ` ${text.toLowerCase()} `
  const scores = new Map<string, number>()
  const evidence = new Map<string, string[]>()

  for (const cue of CUES) {
    let score = 0
    const hits: string[] = []
    for (const phrase of cue.phrases ?? []) {
      if (lower.includes(phrase)) {
        score += 3
        hits.push(phrase)
      }
    }
    for (const word of cue.words) {
      // Whole-word only: "market" must not match "marketing".
      const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (pattern.test(lower)) {
        score += word.includes(' ') ? 2 : 1
        hits.push(word)
      }
    }
    if (score) {
      // Capped: a long feature list ("payment", "refund", "payout") describes
      // features, not the kind of product. Five points is enough evidence.
      scores.set(cue.id, Math.min(score, 5))
      evidence.set(cue.id, hits.slice(0, 5))
    }
  }

  const head = headNoun(text)
  if (head) {
    const headWords = new Set(words(head))
    for (const cue of CUES) {
      const hit = cue.words.filter((word) => headWords.has(word) || words(head).includes(word))
      if (hit.length) {
        // The head noun — "a booking tool" — is the strongest single signal.
        scores.set(cue.id, (scores.get(cue.id) ?? 0) + 6)
        evidence.set(cue.id, [...(evidence.get(cue.id) ?? []), ...hit.slice(0, 2)])
      }
    }
  }

  let best = ''
  let bestScore = 0
  for (const cue of CUES) {
    const score = scores.get(cue.id) ?? 0
    if (score > bestScore) {
      best = cue.id
      bestScore = score
    }
  }

  // Every noun the packs treat as a record: plural cue words that are not people.
  const recordWords = new Set(CUES.flatMap((cue) => cue.words).filter((word) => /s$/.test(word) && !PEOPLE.has(word)))
  const hits = evidence.get(best) ?? []
  const actor = findActor(text, recordWords)
  const object = findObject(text, actor, hits, recordWords)
  const seed = hashString(text.toLowerCase())

  return {
    archetypeId: bestScore >= 2 ? best : '',
    matched: [...new Set(hits)].slice(0, 5),
    sentence: firstSentence(text),
    actor,
    object,
    name: bestScore >= 2 ? nameFrom(actor, object, text, seed) : '',
    used: true,
  }
}

/** Short, human description of what the reader understood — shown in the UI. */
export function describeIntake(intake: Intake): string {
  if (!intake.used) return 'No description yet — the starter product is shown as-is.'
  const parts: string[] = []
  if (intake.archetypeId) parts.push(`reads as a ${intake.archetypeId.replace('fieldops', 'field-ops')} product`)
  if (intake.actor) parts.push(`for ${intake.actor}`)
  if (intake.object) parts.push(`working on ${intake.object}`)
  if (intake.name) parts.push(`named ${intake.name}`)
  return parts.length ? parts.join(', ') : 'Length is enough to compile, but no category words were recognised.'
}
