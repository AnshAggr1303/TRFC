'use client';

import { useCallback } from 'react';
import { Plus, Trash2, Banknote, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditableCell } from '@/components/ui/editable-cell';
import { useExpenseSuggestions } from '@/hooks/use-daily-register';
import { 
  DailyRegisterData, 
  ExpenseRow, 
  generateRowId 
} from '@/types/daily-register';
import { cn } from '@/lib/utils';

interface MainSheetProps {
  data: DailyRegisterData;
  onChange: (updates: Partial<DailyRegisterData>) => void;
  isEditable: boolean;
}

// Fallback suggestions if database has none
const FALLBACK_SUGGESTIONS = [
  'Vegetables', 'Tomatoes', 'Onions', 'Potatoes',
  'Chicken BL', 'Chicken WB', 'Paneer', 'Cheese',
  'Gas Cylinder', 'Ice', 'Packaging', 'Transport',
  'Cleaning', 'Repairs', 'Petrol', 'Chai/Snacks'
];

export function MainSheet({ data, onChange, isEditable }: MainSheetProps) {
  // Fetch expense suggestions from database
  const { data: dbSuggestions = [] } = useExpenseSuggestions();
  
  // Use database suggestions or fallback
  const suggestions = dbSuggestions.length > 0 ? dbSuggestions : FALLBACK_SUGGESTIONS;

  // ============================================
  // SALES HANDLERS
  // ============================================
  
  const handleSalesChange = useCallback((rowId: string, amount: number) => {
    const updatedSales = data.sales.map(row => 
      row.id === rowId ? { ...row, amount } : row
    );
    
    const totalSales = updatedSales.reduce((sum, row) => sum + row.amount, 0);
    const todaysCash = updatedSales.find(r => r.id === 'cash')?.amount || 0;
    
    // Recalculate cash reconciliation
    const cashRecon = {
      ...data.cashRecon,
      todaysCash,
      expectedCash: data.cashRecon.openingCash + todaysCash - data.cashRecon.todaysExpense,
      difference: (data.cashRecon.openingCash + todaysCash - data.cashRecon.todaysExpense) - data.cashRecon.actualCash,
    };
    
    onChange({ sales: updatedSales, totalSales, cashRecon });
  }, [data, onChange]);

  // ============================================
  // EXPENSE HANDLERS
  // ============================================
  
  const handleExpenseChange = useCallback((
    isCash: boolean,
    rowId: string,
    field: 'description' | 'amount',
    value: string | number
  ) => {
    const expenseKey = isCash ? 'cashExpenses' : 'onlineExpenses';
    const expenses = data[expenseKey];
    
    const updatedExpenses = expenses.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    );
    
    const total = updatedExpenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    
    const updates: Partial<DailyRegisterData> = {
      [expenseKey]: updatedExpenses,
      [isCash ? 'totalCashExpenses' : 'totalOnlineExpenses']: total,
      totalExpenses: isCash 
        ? total + data.totalOnlineExpenses 
        : data.totalCashExpenses + total,
    };
    
    // Update cash reconciliation if cash expense changed
    if (isCash) {
      updates.cashRecon = {
        ...data.cashRecon,
        todaysExpense: total,
        expectedCash: data.cashRecon.openingCash + data.cashRecon.todaysCash - total,
        difference: (data.cashRecon.openingCash + data.cashRecon.todaysCash - total) - data.cashRecon.actualCash,
      };
    }
    
    onChange(updates);
  }, [data, onChange]);

  const addExpenseRow = useCallback((isCash: boolean) => {
    const expenseKey = isCash ? 'cashExpenses' : 'onlineExpenses';
    const newRow: ExpenseRow = {
      id: generateRowId(),
      description: '',
      amount: 0,
      isCash,
    };
    
    onChange({
      [expenseKey]: [...data[expenseKey], newRow],
    });
  }, [data, onChange]);

  const removeExpenseRow = useCallback((isCash: boolean, rowId: string) => {
    const expenseKey = isCash ? 'cashExpenses' : 'onlineExpenses';
    const updatedExpenses = data[expenseKey].filter(row => row.id !== rowId);
    const total = updatedExpenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    
    const updates: Partial<DailyRegisterData> = {
      [expenseKey]: updatedExpenses,
      [isCash ? 'totalCashExpenses' : 'totalOnlineExpenses']: total,
      totalExpenses: isCash 
        ? total + data.totalOnlineExpenses 
        : data.totalCashExpenses + total,
    };
    
    if (isCash) {
      updates.cashRecon = {
        ...data.cashRecon,
        todaysExpense: total,
        expectedCash: data.cashRecon.openingCash + data.cashRecon.todaysCash - total,
        difference: (data.cashRecon.openingCash + data.cashRecon.todaysCash - total) - data.cashRecon.actualCash,
      };
    }
    
    onChange(updates);
  }, [data, onChange]);

  // ============================================
  // CASH RECONCILIATION HANDLERS
  // ============================================
  
  const handleActualCashChange = useCallback((value: number) => {
    const cashRecon = {
      ...data.cashRecon,
      actualCash: value,
      difference: data.cashRecon.expectedCash - value,
    };
    onChange({ cashRecon });
  }, [data, onChange]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">DAILY SALES, EXPENSE & CASH REGISTER</h2>
        <p className="text-muted-foreground">
          {data.shopName} ({data.shopCode}) • {new Date(data.logDate).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Sales + Cash Reconciliation */}
        <div className="space-y-6">
          {/* SALES TABLE */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950 px-4 py-2 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                SALES
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left text-sm font-medium">Source</th>
                  <th className="px-4 py-2 text-right text-sm font-medium w-32">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-1 text-sm">
                      {row.source}
                      {row.id === 'cash' && <span className="text-green-600 ml-1">(+)</span>}
                      {row.id !== 'cash' && <span className="text-blue-600 ml-1">(+)</span>}
                    </td>
                    <td className="p-0">
                      <EditableCell
                        value={row.amount}
                        onChange={(val) => handleSalesChange(row.id, Number(val))}
                        type="number"
                        placeholder="0"
                        disabled={!isEditable}
                        className="text-sm"
                      />
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="border-t-2 bg-blue-50 dark:bg-blue-950 font-bold">
                  <td className="px-4 py-2">TOTAL SALES</td>
                  <td className="px-4 py-2 text-right">
                    ₹{data.totalSales.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CASH RECONCILIATION */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-amber-50 dark:bg-amber-950 px-4 py-2 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                CASH RECONCILIATION
              </h3>
            </div>
            <table className="w-full">
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2 text-sm">Opening Cash</td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    ₹{data.cashRecon.openingCash.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 text-sm text-green-700">Today&apos;s Cash (+)</td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-green-700">
                    ₹{data.cashRecon.todaysCash.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 text-sm text-red-700">Today&apos;s Expense (−)</td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-red-700">
                    ₹{data.cashRecon.todaysExpense.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="border-b bg-muted/50">
                  <td className="px-4 py-2 text-sm font-medium">Expected Cash</td>
                  <td className="px-4 py-2 text-right text-sm font-bold">
                    ₹{data.cashRecon.expectedCash.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 text-sm">Cash in Drawer</td>
                  <td className="p-0">
                    <EditableCell
                      value={data.cashRecon.actualCash}
                      onChange={(val) => handleActualCashChange(Number(val))}
                      type="number"
                      placeholder="Enter actual cash"
                      disabled={!isEditable}
                      className="text-sm font-medium"
                    />
                  </td>
                </tr>
                <tr className={cn(
                  "font-bold",
                  data.cashRecon.difference === 0 
                    ? "bg-green-50 dark:bg-green-950" 
                    : data.cashRecon.difference < 0 
                      ? "bg-red-50 dark:bg-red-950" 
                      : "bg-amber-50 dark:bg-amber-950"
                )}>
                  <td className="px-4 py-2">Difference (EC - AC)</td>
                  <td className={cn(
                    "px-4 py-2 text-right",
                    data.cashRecon.difference === 0 
                      ? "text-green-700" 
                      : data.cashRecon.difference < 0 
                        ? "text-red-700" 
                        : "text-amber-700"
                  )}>
                    {data.cashRecon.difference === 0 
                      ? '✓ Matched' 
                      : `₹${Math.abs(data.cashRecon.difference).toLocaleString('en-IN')} ${data.cashRecon.difference < 0 ? '(Short)' : '(Excess)'}`
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Expenses */}
        <div className="space-y-6">
          {/* CASH EXPENSES */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-red-50 dark:bg-red-950 px-4 py-2 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                CASH EXPENSES
              </h3>
              {isEditable && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => addExpenseRow(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left text-sm font-medium">Item</th>
                  <th className="px-4 py-2 text-right text-sm font-medium w-28">Amount (₹)</th>
                  {isEditable && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {data.cashExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={isEditable ? 3 : 2} className="px-4 py-4 text-center text-muted-foreground text-sm">
                      No cash expenses. Click &quot;Add&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  data.cashExpenses.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-0">
                        <EditableCell
                          value={row.description}
                          onChange={(val) => handleExpenseChange(true, row.id, 'description', String(val))}
                          type="text"
                          placeholder="Enter item..."
                          suggestions={suggestions}
                          disabled={!isEditable}
                          className="text-sm"
                        />
                      </td>
                      <td className="p-0">
                        <EditableCell
                          value={row.amount}
                          onChange={(val) => handleExpenseChange(true, row.id, 'amount', Number(val))}
                          type="number"
                          placeholder="0"
                          disabled={!isEditable}
                          className="text-sm"
                        />
                      </td>
                      {isEditable && (
                        <td className="px-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeExpenseRow(true, row.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {/* Total Row */}
                <tr className="border-t-2 bg-red-50 dark:bg-red-950 font-bold">
                  <td className="px-4 py-2">Total Cash Expense</td>
                  <td className="px-4 py-2 text-right" colSpan={isEditable ? 2 : 1}>
                    ₹{data.totalCashExpenses.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ONLINE EXPENSES */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-purple-50 dark:bg-purple-950 px-4 py-2 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                ONLINE EXPENSES
              </h3>
              {isEditable && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => addExpenseRow(false)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left text-sm font-medium">Item</th>
                  <th className="px-4 py-2 text-right text-sm font-medium w-28">Amount (₹)</th>
                  {isEditable && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {data.onlineExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={isEditable ? 3 : 2} className="px-4 py-4 text-center text-muted-foreground text-sm">
                      No online expenses. Click &quot;Add&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  data.onlineExpenses.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-0">
                        <EditableCell
                          value={row.description}
                          onChange={(val) => handleExpenseChange(false, row.id, 'description', String(val))}
                          type="text"
                          placeholder="Enter item..."
                          suggestions={suggestions}
                          disabled={!isEditable}
                          className="text-sm"
                        />
                      </td>
                      <td className="p-0">
                        <EditableCell
                          value={row.amount}
                          onChange={(val) => handleExpenseChange(false, row.id, 'amount', Number(val))}
                          type="number"
                          placeholder="0"
                          disabled={!isEditable}
                          className="text-sm"
                        />
                      </td>
                      {isEditable && (
                        <td className="px-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeExpenseRow(false, row.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {/* Total Row */}
                <tr className="border-t-2 bg-purple-50 dark:bg-purple-950 font-bold">
                  <td className="px-4 py-2">Total Online Expense</td>
                  <td className="px-4 py-2 text-right" colSpan={isEditable ? 2 : 1}>
                    ₹{data.totalOnlineExpenses.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTAL EXPENSES */}
          <div className="border rounded-lg bg-muted/50 p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">TOTAL EXPENSES</span>
              <span className="text-xl font-bold">
                ₹{data.totalExpenses.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Row */}
      <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-8">
        <div>
          <label className="text-sm text-muted-foreground">Name</label>
          <EditableCell
            value={data.managerName}
            onChange={(val) => onChange({ managerName: String(val) })}
            type="text"
            placeholder="Enter name..."
            disabled={!isEditable}
            className="border-b border-dashed mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Signature</label>
          <div className="border-b border-dashed mt-1 h-8"></div>
        </div>
      </div>
    </div>
  );
}