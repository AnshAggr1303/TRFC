// Types for Spreadsheet-style Daily Register

// ============================================
// MAIN SHEET (TRFC) TYPES
// ============================================

export interface SalesRow {
  id: string;
  source: string;           // Cash, UPI, Swiggy, etc.
  paymentMethodId: string;
  amount: number;
  isEditable: boolean;      // Source name is not editable
}

export interface ExpenseRow {
  id: string;
  description: string;      // Free text with suggestions
  amount: number;
  isCash: boolean;          // true = Cash expense, false = Online expense
  categoryId?: string;      // Optional link to expense category
  vendorId?: string;        // Optional link to vendor
}

export interface CashReconciliation {
  openingCash: number;      // Auto from yesterday
  todaysCash: number;       // Auto from sales (Cash row)
  todaysExpense: number;    // Auto from cash expenses
  expectedCash: number;     // Calculated: opening + cash - expense
  actualCash: number;       // User input
  difference: number;       // Calculated: expected - actual
}

export interface DailyRegisterData {
  // Meta
  id?: string;              // daily_sales_logs.id if exists
  shopId: string;
  shopCode: string;
  shopName: string;
  logDate: string;          // YYYY-MM-DD
  status: 'draft' | 'submitted' | 'verified' | 'locked';
  
  // Sales
  sales: SalesRow[];
  totalSales: number;
  
  // Expenses
  cashExpenses: ExpenseRow[];
  onlineExpenses: ExpenseRow[];
  totalCashExpenses: number;
  totalOnlineExpenses: number;
  totalExpenses: number;
  
  // Cash Reconciliation
  cashRecon: CashReconciliation;
  
  // Signature
  managerName: string;
  
  // Audit
  lastSavedAt?: string;
  lastSavedBy?: string;
}

// ============================================
// INVENTORY SHEET TYPES
// ============================================

export interface StockRow {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  kalKa: number;            // Yesterday's closing (Opening)
  aajKitnaAya: number;      // Received today
  kitnaBachGaya: number;    // Closing stock (user input)
  kitnaMangwanaHai: number; // To order (user input)
  consumed?: number;        // Calculated: kalKa + aajKitnaAya - kitnaBachGaya
}

export interface StockSheetData {
  shopId: string;
  shopCode: string;
  section: string;          // 'kitchen', 'fridge', 'bakery', etc.
  logDate: string;
  items: StockRow[];
}

// ============================================
// SHEET TABS CONFIG
// ============================================

export interface SheetTab {
  id: string;
  name: string;
  shortName: string;
  type: 'main' | 'stock';
  shopCode?: string;        // For stock sheets
  section?: string;         // For stock sheets
}

export const DEFAULT_SHEET_TABS: SheetTab[] = [
  { id: 'trfc', name: 'Daily Sales & Cash', shortName: 'TRFC', type: 'main' },
  { id: 'trk-k', name: 'TRK Kitchen Stock', shortName: 'TRK Kitchen', type: 'stock', shopCode: 'TRK', section: 'kitchen' },
  { id: 'trk-f', name: 'TRK Fridge Stock', shortName: 'TRK Fridge', type: 'stock', shopCode: 'TRK', section: 'fridge' },
  { id: 'trs', name: 'TRS Stock', shortName: 'TRS', type: 'stock', shopCode: 'TRS', section: 'main' },
  { id: 'tfc-b', name: 'TFC Bakery Stock', shortName: 'TFC Bakery', type: 'stock', shopCode: 'TFC', section: 'bakery' },
  { id: 'tfc-k', name: 'TFC Kitchen Stock', shortName: 'TFC Kitchen', type: 'stock', shopCode: 'TFC', section: 'kitchen' },
];

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_SALES_SOURCES = [
  { id: 'cash', source: 'Cash', paymentMethodId: '' },
  { id: 'upi', source: 'UPI', paymentMethodId: '' },
  { id: 'swiggy', source: 'Swiggy', paymentMethodId: '' },
  { id: 'zomato', source: 'Zomato', paymentMethodId: '' },
  { id: 'other', source: 'Other Online', paymentMethodId: '' },
];

export function createEmptyRegisterData(shopId: string, shopCode: string, shopName: string, logDate: string): DailyRegisterData {
  return {
    shopId,
    shopCode,
    shopName,
    logDate,
    status: 'draft',
    
    sales: DEFAULT_SALES_SOURCES.map(s => ({
      id: s.id,
      source: s.source,
      paymentMethodId: s.paymentMethodId,
      amount: 0,
      isEditable: false,
    })),
    totalSales: 0,
    
    cashExpenses: [],
    onlineExpenses: [],
    totalCashExpenses: 0,
    totalOnlineExpenses: 0,
    totalExpenses: 0,
    
    cashRecon: {
      openingCash: 0,
      todaysCash: 0,
      todaysExpense: 0,
      expectedCash: 0,
      actualCash: 0,
      difference: 0,
    },
    
    managerName: '',
  };
}

// Generate unique ID for new rows
export function generateRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}