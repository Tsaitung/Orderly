// Light-weight date helpers for consistent formatting

export function toDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input
}

// Returns 'YYYY-MM-DD'
export function formatDateOnly(date: Date | string): string {
  const d = toDate(date)
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Re-export richer date helpers so callers can import everything from 'lib/date'
export { formatDate, formatRelativeTime } from './utils'
