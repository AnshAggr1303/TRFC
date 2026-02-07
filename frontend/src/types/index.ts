// Re-export database types
export * from './database.types'

import type { Database, Tables, Enums } from './database.types'

// ============================================================================
// Convenience Type Aliases
// ============================================================================

export type Organization = Tables<'organizations'>
export type Shop = Tables<'shops'>
export type Profile = Tables<'profiles'>

// ============================================================================
// Custom Application Types
// ============================================================================

// User with expanded relations
export interface UserWithProfile {
  id: string
  email: string
  profile: Profile | null
  shops: Shop[]
  permissions: string[]
}

// Daily Closing Wizard State
export interface DailyClosingState {
  shopId: string
  logDate: string
  step: 'sales' | 'expenses' | 'cash' | 'inventory' | 'review'
  
  // Step 1: Sales
  salesEntries: SalesEntry[]
  
  // Step 2: Expenses
  expenses: ExpenseEntry[]
  
  // Step 3: Cash Reconciliation
  cashReconciliation: {
    openingCash: number
    cashIn: number
    cashSales: number
    cashExpenses: number
    cashOut: number
    expectedClosing: number
    actualClosing: number
    variance: number
  }
  
  // Step 4: Inventory
  inventoryEntries: InventoryEntry[]
  
  // Metadata
  notes: string
  status: 'draft' | 'submitted'
}

export interface SalesEntry {
  paymentMethodId: string
  paymentMethodName: string
  grossAmount: number
  commission: number
  netAmount: number
}

export interface ExpenseEntry {
  id?: string
  categoryId: string
  categoryName: string
  vendorId?: string
  vendorName?: string
  description: string
  amount: number
  paymentMethod: 'cash' | 'online' | 'credit'
}

export interface InventoryEntry {
  itemId: string
  itemName: string
  unit: string
  openingStock: number
  received: number
  closingStock: number
  consumed: number
  wastage: number
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================================================
// Form Types (used with react-hook-form)
// ============================================================================

export interface LoginFormData {
  email: string
  password: string
}

export interface DailySalesFormData {
  logDate: string
  salesEntries: {
    paymentMethodId: string
    grossAmount: number
  }[]
}

export interface ExpenseFormData {
  expenseDate: string
  categoryId: string
  vendorId?: string
  description: string
  amount: number
  paymentMethod: 'cash' | 'online' | 'credit'
}
