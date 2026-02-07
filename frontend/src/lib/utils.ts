import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

// ============================================================================
// Class Name Utilities (for Tailwind + shadcn)
// ============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// Currency Formatting
// ============================================================================

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const INR_FORMATTER_DECIMAL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount: number, showDecimal = false): string {
  return showDecimal 
    ? INR_FORMATTER_DECIMAL.format(amount)
    : INR_FORMATTER.format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

// ============================================================================
// Date Formatting
// ============================================================================

export function formatDate(date: string | Date, formatStr = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy, hh:mm a')
}

export function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getIndianFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() // 0-indexed
  const year = date.getFullYear()
  
  if (month >= 3) { // April onwards
    return `${year}-${(year + 1).toString().slice(-2)}`
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================================
// Misc Utilities
// ============================================================================

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Get initials from name (e.g., "John Doe" -> "JD")
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ============================================================================
// Cash Reconciliation Helpers
// ============================================================================

export function calculateExpectedCash(
  opening: number,
  cashIn: number,
  cashSales: number,
  cashExpenses: number,
  cashOut: number
): number {
  return opening + cashIn + cashSales - cashExpenses - cashOut
}

export function calculateVariance(expected: number, actual: number): number {
  return actual - expected
}

// ============================================================================
// Inventory Helpers
// ============================================================================

export function calculateConsumed(
  opening: number,
  received: number,
  closing: number
): number {
  const consumed = opening + received - closing
  return Math.max(0, consumed) // Can't be negative
}
