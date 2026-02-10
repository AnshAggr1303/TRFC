// src/types/daily-register.ts
// Types for the Daily Register feature

export interface SalesRow {
  id: string;
  source: string; // Cash, UPI, Swiggy, Zomato, Other Online
  paymentMethodId: string;
  amount: number;
  isEditable: boolean;
}

export interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  isCash: boolean;
  categoryId?: string;
  vendorId?: string;
}

export interface CashReconData {
  openingCash: number;
  todaysCash: number; // Cash sales
  todaysExpense: number; // Cash expenses
  expectedCash: number; // Opening + Cash Sales - Cash Expenses
  actualCash: number; // User entered
  difference: number; // ✅ CORRECT: Actual - Expected (positive = excess, negative = short)
  isOpeningEditable?: boolean; // Allow manual entry if no previous data
  
}

export interface StockRow {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  opening: number;
  received: number;
  closing: number;
  consumed: number; // Calculated: opening + received - closing
  ordered?: number; // Kitna Mangwana Hai
  deliveredQty?: number; // Kitna Aaya
  variance?: number; // Calculated: deliveredQty - ordered
}

export interface DailyRegisterData {
  id?: string;
  shopId: string;
  shopCode: string;
  shopName: string;
  logDate: string; // YYYY-MM-DD
  status: 'draft' | 'submitted' | 'verified';

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
  cashRecon: CashReconData;

  // Metadata (auto-captured - no manual name/signature needed)
  lastSavedAt?: string;
}

export interface SheetTab {
  id: string;
  type: 'main' | 'stock';
  name: string;
  shortName: string;
  shopCode?: string;
  section?: string;
}

export const DEFAULT_SHEET_TABS: SheetTab[] = [
  { id: 'trfc', type: 'main', name: 'Daily Register', shortName: 'TRFC' },
  { id: 'trk-stock', type: 'stock', name: 'TRK Stock', shortName: 'TRK Stock', shopCode: 'TRK', section: 'kitchen' },
  { id: 'trs-stock', type: 'stock', name: 'TRS Stock', shortName: 'TRS Stock', shopCode: 'TRS', section: 'shawarma' },
  { id: 'tfc-stock', type: 'stock', name: 'TFC Stock', shortName: 'TFC Stock', shopCode: 'TFC', section: 'foodcourt' },
  { id: 'trj-stock', type: 'stock', name: 'TRJ Stock', shortName: 'TRJ Stock', shopCode: 'TRJ', section: 'jaipur' },
];

// Helper to generate unique row IDs
export function generateRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to create empty register data
export function createEmptyRegisterData(
  shopId: string,
  shopCode: string,
  shopName: string,
  logDate: string
): DailyRegisterData {
  return {
    shopId,
    shopCode,
    shopName,
    logDate,
    status: 'draft',

    sales: [
      { id: 'cash', source: 'Cash', paymentMethodId: '', amount: 0, isEditable: false },
      { id: 'upi', source: 'UPI', paymentMethodId: '', amount: 0, isEditable: false },
      { id: 'swiggy', source: 'Swiggy', paymentMethodId: '', amount: 0, isEditable: false },
      { id: 'zomato', source: 'Zomato', paymentMethodId: '', amount: 0, isEditable: false },
      { id: 'other', source: 'Other Online', paymentMethodId: '', amount: 0, isEditable: false },
    ],
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
      isOpeningEditable: false,
    },
  };
}