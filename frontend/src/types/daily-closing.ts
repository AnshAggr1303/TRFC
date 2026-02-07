// Types for Daily Closing Wizard

export interface SalesEntry {
  paymentMethodId: string;
  paymentMethodName: string;
  methodType: string;
  isCash: boolean;
  grossAmount: number;
  returnsAmount: number;
  netAmount: number;
}

export interface ExpenseEntry {
  id?: string; // For editing existing
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  vendorId?: string;
  vendorName?: string;
  isCash: boolean;
}

export interface InventoryEntry {
  itemId: string;
  itemName: string;
  unit: string;
  openingStock: number;
  received: number;
  closingStock: number;
  consumed: number; // Calculated: opening + received - closing
}

export interface WizardData {
  // Step 1: Shop & Date
  shopId: string;
  shopName: string;
  shopCode: string;
  logDate: string; // YYYY-MM-DD format
  existingLogId?: string; // If editing existing log
  
  // Step 2: Sales
  salesEntries: SalesEntry[];
  grossSales: number;
  totalReturns: number;
  netSales: number;
  
  // Step 3: Expenses
  expenses: ExpenseEntry[];
  totalCashExpenses: number;
  totalOnlineExpenses: number;
  
  // Step 4: Cash Reconciliation
  openingCash: number;
  cashSales: number; // Auto-calculated from sales
  cashIn: number; // Manual additions (petty cash refill)
  cashExpenses: number; // Auto-calculated from expenses
  cashOut: number; // Manual removals (bank deposit, drawings)
  expectedClosing: number; // Calculated
  actualClosing: number; // User enters
  variance: number; // Calculated
  varianceReason: string;
  
  // Step 5: Inventory
  inventoryEntries: InventoryEntry[];
  
  // General
  notes: string;
  status: 'draft' | 'submitted';
}

export const initialWizardData: WizardData = {
  shopId: '',
  shopName: '',
  shopCode: '',
  logDate: new Date().toISOString().split('T')[0],
  
  salesEntries: [],
  grossSales: 0,
  totalReturns: 0,
  netSales: 0,
  
  expenses: [],
  totalCashExpenses: 0,
  totalOnlineExpenses: 0,
  
  openingCash: 0,
  cashSales: 0,
  cashIn: 0,
  cashExpenses: 0,
  cashOut: 0,
  expectedClosing: 0,
  actualClosing: 0,
  variance: 0,
  varianceReason: '',
  
  inventoryEntries: [],
  
  notes: '',
  status: 'draft',
};

// Helper type for shop selection
export interface ShopOption {
  id: string;
  name: string;
  code: string;
}

// Helper type for payment methods
export interface PaymentMethod {
  id: string;
  name: string;
  methodType: string;
  isCash: boolean;
  displayOrder: number;
}

// Helper type for expense categories
export interface ExpenseCategory {
  id: string;
  name: string;
  parentId?: string;
  displayOrder: number;
}