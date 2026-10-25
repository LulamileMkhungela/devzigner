import type { EntityField } from '../types'
import type { Rng } from './rng'

const FIRST = [
  'Nomsa', 'Thabo', 'Lerato', 'Sipho', 'Zanele', 'Kabelo', 'Ayanda', 'Tshepo', 'Refilwe', 'Andile',
  'Marius', 'Priya', 'Ines', 'Dario', 'Nadia', 'Lindi', 'Owen', 'Sofia', 'Jonas', 'Amara',
  'Elena', 'Marcus', 'Yusuf', 'Aisha', 'Diego', 'Mei', 'Noah', 'Fatima', 'Oscar', 'Hannah',
  'Tariq', 'Bea', 'Kwame', 'Sara', 'Ravi', 'Chloe', 'Emeka', 'Nina', 'Luca', 'Grace',
]

const LAST = [
  'Mkhungela', 'Dlamini', 'Naidoo', 'Botha', 'Khumalo', 'Mokoena', 'Van Wyk', 'Pillay', 'Nkomo', 'Meyer',
  'Okafor', 'Silva', 'Tanaka', 'Haddad', 'Novak', 'Mensah', 'Ibrahim', 'Rossi', 'Du Plessis', 'Nkosi',
  'Fischer', 'Adeyemi', 'Costa', 'Sharma', 'Bauer', 'Mahlangu', 'Sithole', 'Jansen', 'Weber', 'Diallo',
]

export const PERSON_NAMES = FIRST.map((f, i) => `${f} ${LAST[i % LAST.length]}`)

const COMPANIES = [
  'Atlas Freight', 'Blue Ridge Co', 'Cedar & Finch', 'Delta Works', 'Ember Supply', 'Foxglove Studio',
  'Granite Union', 'Harborline', 'Ironwood Group', 'Juniper Labs', 'Kestrel Partners', 'Lattice & Co',
  'Meridian Health', 'Northgate Retail', 'Orchid House', 'Pinecrest Foods', 'Quarry Nine', 'Redwood Digital',
  'Silverbrook', 'Tidewater Ltd', 'Umbrella Works', 'Vantage Point', 'Wildacre', 'Ximena Supply',
  'Yellowline', 'Zenith Interiors', 'Anchor Row', 'Brightfield', 'Copperleaf', 'Dune & Co',
]

const CITIES = [
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein', 'Nairobi', 'Lagos',
  'Accra', 'Kigali', 'Windhoek', 'Gaborone', 'Maputo', 'Lusaka', 'Harare', 'Lisbon', 'Berlin', 'Austin',
  'Toronto', 'Manchester', 'Rotterdam', 'Dubai', 'Singapore', 'Melbourne',
]

const STREETS = ['Kloof', 'Bree', 'Commissioner', 'Long', 'Rivonia', 'Oxford', 'Loop', 'Church', 'Main', 'Victoria', 'Market', 'Dock']
const SUBURBS = ['Braamfontein', 'Woodstock', 'Umhlanga', 'Menlyn', 'Parkhurst', 'Observatory', 'Sandton', 'Rosebank', 'Sea Point', 'Hatfield']

const TAG_POOL = [
  'Retail', 'Wholesale', 'B2B', 'B2C', 'Enterprise', 'SMB', 'Direct', 'Partner', 'Priority', 'Seasonal',
  'Recurring', 'One-off', 'Internal', 'External', 'North', 'South', 'Core', 'Pilot', 'Legacy', 'New',
]

const PRODUCTS = [
  'Oak shelf', 'Ceramic mug', 'Linen throw', 'Walnut stool', 'Brass lamp', 'Wool runner', 'Glass carafe',
  'Canvas tote', 'Copper kettle', 'Marble tray', 'Rattan basket', 'Stoneware bowl', 'Beeswax candle',
  'Cotton apron', 'Leather journal', 'Steel scissors', 'Soy candle', 'Cork coaster set',
]

const MERCHANTS = [
  'Takeaway Coffee', 'Office Express', 'Cloudworks', 'Hardware Depot', 'Fuel Stop', 'Print & Copy',
  'Design Supply', 'Courier Co', 'Team Lunch', 'Software Sub', 'Stationery World', 'Electric City',
]

const VEHICLES = ['Toyota Hilux', 'Ford Ranger', 'Isuzu D-Max', 'VW Crafter', 'Mercedes Sprinter', 'MAN TGL', 'Hino 300', 'Nissan NP200']

const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'Carpentry', 'Auto electric', 'Locksmith', 'Painting', 'Roofing']

const CATEGORY_WORDS = [
  'Home', 'Kitchen', 'Outdoor', 'Textiles', 'Lighting', 'Stationery', 'Wellness', 'Tools',
  'Garden', 'Storage', 'Apparel', 'Electronics',
]

export function personName(rng: Rng): string {
  return rng.pick(PERSON_NAMES)
}

export function companyName(rng: Rng): string {
  return rng.pick(COMPANIES)
}

export function city(rng: Rng): string {
  return rng.pick(CITIES)
}

export function address(rng: Rng): string {
  return `${rng.int(2, 240)} ${rng.pick(STREETS)} Rd, ${rng.pick(SUBURBS)}`
}

export function tag(rng: Rng): string {
  return rng.pick(TAG_POOL)
}

export function productName(rng: Rng): string {
  return `${rng.pick(PRODUCTS)} ${rng.pick(['no. ' + rng.int(1, 9), 'set', 'mini', 'large', 'duo', ''])}`.trim()
}

export function merchant(rng: Rng): string {
  return rng.pick(MERCHANTS)
}

export function vehicleModel(rng: Rng): string {
  return rng.pick(VEHICLES)
}

export function trade(rng: Rng): string {
  return rng.pick(TRADES)
}

export function categoryWord(rng: Rng): string {
  return rng.pick(CATEGORY_WORDS)
}

const ENTITY_NAMES: Record<string, (rng: Rng) => string> = {
  vendors: companyName,
  accounts: companyName,
  companies: companyName,
  properties: (rng) => `${rng.pick(['Cedar', 'Acacia', 'Willow', 'Oak', 'Maple', 'Ebony', 'Jacaranda'])} ${rng.pick(['Court', 'Place', 'Mews', 'Gardens', 'Rise'])}`,
  eventseries: (rng) => `${rng.pick(['Gather', 'Signal', 'Marquee', 'Field Day', 'Assembly', 'Circuit'])} ${rng.pick(['2026', '’26', 'Cape Town', 'Nairobi', 'Live'])}`,
  cohorts: (rng) => `${rng.pick(['Cohort', 'Intake', 'Group'])} ${rng.int(4, 19)} · ${rng.pick(['Product', 'Data', 'Design', 'Engineering'])}`,
  budgets: (rng) => `${rng.pick(['Marketing', 'Engineering', 'Operations', 'Design', 'Sales'])} ${rng.pick(['Q4', 'Q1', 'H2', 'annual'])}`,
  cards: (rng) => `${rng.pick(['Ops', 'Growth', 'Design', 'Field', 'Travel'])} card`,
  channels: (rng) => rng.pick(['Instagram', 'YouTube', 'LinkedIn', 'TikTok', 'Newsletter', 'Podcast']),
  contacts: personName,
  people: personName,
  patients: personName,
  tenants: personName,
  technicians: personName,
  learners: personName,
  candidates: personName,
  speakers: personName,
  attendees: personName,
  drivers: personName,
}

const TITLE_GEN: Record<string, (rng: Rng) => string> = {
  products: productName,
  sessions: (rng) =>
    rng.pick([
      'Shipping faster with agents',
      'The quiet cost of bad data',
      'Design systems that survive contact',
      'From spreadsheet to system',
      'Building for the field',
      'What we learned from 200 interviews',
    ]),
  content: (rng) =>
    rng.pick([
      'How we cut onboarding to four minutes',
      'The three numbers we actually watch',
      'Behind the scenes: the Q4 shoot',
      'A field guide to exceptions',
      'Why we killed our own dashboard',
    ]),
  lessons: (rng) =>
    rng.pick([
      'Reading a P&L in twenty minutes',
      'Intro to discovery interviews',
      'Designing for constrained devices',
      'Writing the first failing test',
      'Handling conflict on a small team',
    ]),
  jobs: (rng) =>
    rng.pick([
      'Replace the pump seal',
      'Annual service and inspection',
      'Intermittent fault on the control board',
      'Install a second pressure valve',
      'Emergency callout: no hot water',
    ]),
}

const TITLES = [
  'Q4 launch plan', 'Onboarding revamp', 'Pricing experiment', 'Supplier consolidation', 'Route reliability',
  'Retention sprint', 'Self-serve checkout', 'Partner briefing', 'Inventory clean-up', 'Service level review',
  'Mobile-first intake', 'Referral programme', 'Capacity planning', 'Compliance refresh', 'Field pilot',
]

export function titleFor(rng: Rng): string {
  return rng.pick(TITLES)
}

export function reference(rng: Rng, prefix: string): string {
  return `${prefix}-${rng.int(1000, 9999)}`
}

export function emailFor(name: string): string {
  const [first, ...rest] = name.toLowerCase().replace(/[^a-z ]/g, '').split(' ')
  const domain = rest.join('') || 'mail'
  return `${first}@${domain.slice(0, 12)}.co`
}

export function phoneNumber(rng: Rng): string {
  return `+27 ${rng.int(60, 84)} ${rng.int(100, 999)} ${rng.int(1000, 9999)}`
}

export function isoDate(offsetDays: number): string {
  const base = new Date(Date.UTC(2026, 9, 24))
  const d = new Date(base.getTime() + offsetDays * 86400000)
  return d.toISOString().slice(0, 10)
}

export function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

export function money(rng: Rng, min: number, max: number): number {
  const raw = rng.int(min, max)
  return Math.round(raw / 5) * 5
}

/** Fill one field with a plausible example. */
export function sampleValue(field: EntityField, rng: Rng, entityId: string): string | number | boolean {
  const key = field.name.toLowerCase()
  const nameGen = ENTITY_NAMES[entityId]
  switch (field.type) {
    case 'text':
      if (/e?mail/.test(key)) return emailFor(personName(rng))
      if (/phone|mobile|tel/.test(key)) return phoneNumber(rng)
      if (/sku|serial|code/.test(key)) return `${entityId.slice(0, 3).toUpperCase()}-${rng.int(100, 999)}`
      if (/reference|ref\b/.test(key)) return reference(rng, entityId.slice(0, 3).toUpperCase())
      if (/last4/.test(key)) return String(rng.int(1000, 9999))
      if (/summary|reason|note|nextstep|access|av|deliverable/.test(key)) return shortSentence(rng)
      if ((key === 'name' || key === 'label') && nameGen) return nameGen(rng)
      if (key === 'title') return (TITLE_GEN[entityId] ?? titleFor)(rng)
      if (/title|name|label|merchant|institution|handle|model|licence/.test(key)) {
        if (/merchant/.test(key)) return merchant(rng)
        if (/model/.test(key)) return vehicleModel(rng)
        if (/institution/.test(key)) return rng.pick(['First National', 'Standard Bank', 'Capitec', 'Investec', 'Nedbank'])
        if (/handle/.test(key)) return '@' + rng.pick(['studio', 'north', 'field', 'lumen', 'harbor', 'draft'])
        if (/licence/.test(key)) return `Code ${rng.pick(['B', 'C1', 'EC'])} ${rng.int(100000, 999999)}`
        return productName(rng)
      }
      if (/owner|assignee|manager|lead|reviewer|holder|producer|instructor|panel|clinician|technician|driver/.test(key)) return personName(rng)
      if (/period|window|cycle|stage|kind|source|level|room|trade|scheme|cover/.test(key)) return rng.pick(TAG_POOL)
      if (/customer|company|vendor|supplier|client/.test(key)) return companyName(rng)
      return rng.pick([companyName(rng), personName(rng), shortSentence(rng)])
    case 'longtext':
      return shortSentence(rng)
    case 'email':
      return emailFor(personName(rng))
    case 'phone':
      return phoneNumber(rng)
    case 'number': {
      if (/score|rating|health|momentum/.test(key)) return rng.int(45, 98)
      if (/stock|qty|quantity|seats|units|employees|assets|visits|stops|stops|learners|candidates|sessions|jobs|hours|candidates/.test(key)) return rng.int(3, 240)
      if (/odometer/.test(key)) return rng.int(12000, 340000)
      if (/distance/.test(key)) return rng.int(12, 640)
      if (/duration|estimate|size|weight|capacity/.test(key)) return rng.int(15, 220)
      if (/order|version/.test(key)) return rng.int(1, 9)
      if (/benchmark|value/.test(key)) return rng.int(400, 9000)
      return rng.int(1, 60)
    }
    case 'percent': {
      if (/commission|escalation|take.?rate/.test(key)) return rng.int(5, 28)
      if (/probability/.test(key)) return rng.int(15, 92)
      if (/allocation|utilisation|utilization|occupancy|occupied|capacity/.test(key)) return rng.int(42, 98)
      if (/burn/.test(key)) return rng.int(28, 106)
      if (/progress|completion|attendance|momentum/.test(key)) return rng.int(46, 99)
      if (/engagement/.test(key)) return rng.int(3, 15)
      return rng.int(12, 98)
    }
    case 'money':
      return money(rng, 120, 24000)
    case 'rating':
      return Number((rng.int(30, 50) / 10).toFixed(1))
    case 'date': {
      if (/joined|since|started|installed|opened|placed|submitted|applied|issued|logged|happened|registered|reviewed|movement/.test(key))
        return isoDate(-rng.int(1, 420))
      if (/due|next|expires|expiry|renewal|window|target|close|deadline|starts|ends|depart|publish|closes|time/.test(key))
        return isoDate(rng.int(1, 120))
      return isoDate(rng.int(-90, 90))
    }
    case 'boolean':
      return rng.chance(0.25)
    case 'status':
      return field.options?.[rng.int(0, (field.options?.length ?? 1) - 1)] ?? 'Active'
    case 'tag':
      if (/trade/.test(key)) return trade(rng)
      if (/category|industry/.test(key)) return categoryWord(rng)
      return tag(rng)
    case 'location':
      if (/address|street/.test(key)) return address(rng)
      return city(rng)
    case 'relation':
      return '—'
    case 'image':
      return 'placeholder'
    default:
      return '—'
  }
}

const SENTENCES = [
  'Confirmed by phone, note added for the team.',
  'Customer asked for a callback before Friday.',
  'Requires a second pair of hands on site.',
  'Escalated from the morning queue, owner assigned.',
  'Waiting on a signed document from the client.',
  'Part ordered, expected in three days.',
  'Resolved on the first visit, no follow-up needed.',
  'Flagged for review after a duplicate was found.',
  'Agreed to a revised timeline with the supplier.',
  'Access restricted, security clearance required.',
]

export function shortSentence(rng: Rng): string {
  return rng.pick(SENTENCES)
}

export function dateOffsetLabel(iso: string): string {
  return shortDate(iso)
}
