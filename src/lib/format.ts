import type { EntityField } from '../types'
import { shortDate } from '../engine/samples'

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function formatCurrency(value: number, currency = 'ZAR', compact = false): string {
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 0,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString()}`
  }
}

export function formatField(field: EntityField | undefined, value: unknown, currency: string): string {
  if (value === undefined || value === null || value === '') return '—'
  if (!field) return String(value)
  switch (field.type) {
    case 'money':
      return typeof value === 'number' ? formatCurrency(value, currency) : String(value)
    case 'date':
      return shortDate(String(value))
    case 'percent':
      return `${value}%`
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'rating':
      return `${value} ★`
    default:
      return String(value)
  }
}

export function humanize(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function download(filename: string, content: string | Blob, mime = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
