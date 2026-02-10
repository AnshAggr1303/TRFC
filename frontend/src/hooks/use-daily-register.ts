'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import type { DailyRegisterData, ExpenseRow, SalesRow } from '@/types/daily-register';
import { createEmptyRegisterData } from '@/types/daily-register';

// ============================================
// FETCH DAILY REGISTER (with related data)
// ============================================

export function useDailyRegister(shopId: string, shopCode: string, shopName: string, logDate: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['daily-register', shopId, logDate],
    queryFn: async (): Promise<DailyRegisterData> => {
      // 1. Try to fetch existing log
      const { data: logDataArray, error: logError } = await supabase
        .from('daily_sales_logs')
        .select('*')
        .eq('shop_id', shopId)
        .eq('log_date', logDate)
        .returns<Database['public']['Tables']['daily_sales_logs']['Row'][]>();

      if (logError) throw logError;

      const existingLog = logDataArray?.[0] || null;

      // 2. Fetch opening cash (previous day's closing)
      const { data: prevLogArray } = await supabase
        .from('daily_sales_logs')
        .select('actual_closing')
        .eq('shop_id', shopId)
        .lt('log_date', logDate)
        .order('log_date', { ascending: false })
        .limit(1)
        .returns<{ actual_closing: number | null }[]>();

      const previousDayClosing = prevLogArray?.[0]?.actual_closing;
      const hasNoPreviousData = previousDayClosing === undefined || previousDayClosing === null;
      
      // Opening cash: use previous day's closing, or 0 if no previous data
      const openingCash = previousDayClosing ?? 0;

      // 3. If no existing log, return empty data with opening cash
      if (!existingLog) {
        const emptyData = createEmptyRegisterData(shopId, shopCode, shopName, logDate);
        emptyData.cashRecon.openingCash = openingCash;
        emptyData.cashRecon.expectedCash = openingCash;
        emptyData.cashRecon.isOpeningEditable = hasNoPreviousData; // Allow manual entry if no previous data
        return emptyData;
      }

      // 4. Fetch sales entries for this log
      type SalesEntryWithMethod = {
        id: string;
        payment_method_id: string;
        gross_amount: number;
        returns_amount: number;
        net_amount: number;
        is_cash: boolean;
        method_type: string;
        payment_methods: { name: string } | null;
      };

      const { data: salesData, error: salesError } = await supabase
        .from('sales_entries')
        .select('id, payment_method_id, gross_amount, returns_amount, net_amount, is_cash, method_type, payment_methods(name)')
        .eq('daily_log_id', existingLog.id)
        .order('created_at', { ascending: true })
        .returns<SalesEntryWithMethod[]>();

      if (salesError) throw salesError;

      // 5. Fetch expenses for this daily log
      type ExpenseWithPayments = {
        id: string;
        description: string;
        amount: number;
        category_id: string | null;
        vendor_id: string | null;
        expense_payments: { is_cash: boolean; amount: number }[];
      };

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id, 
          description, 
          amount, 
          category_id, 
          vendor_id,
          expense_payments(is_cash, amount)
        `)
        .eq('daily_log_id', existingLog.id)
        .order('created_at', { ascending: true })
        .returns<ExpenseWithPayments[]>();

      if (expensesError) throw expensesError;

      // 6. Build sales rows
      const sales: SalesRow[] = [
        { id: 'cash', source: 'Cash', paymentMethodId: '', amount: 0, isEditable: false },
        { id: 'upi', source: 'UPI', paymentMethodId: '', amount: 0, isEditable: false },
        { id: 'swiggy', source: 'Swiggy', paymentMethodId: '', amount: 0, isEditable: false },
        { id: 'zomato', source: 'Zomato', paymentMethodId: '', amount: 0, isEditable: false },
        { id: 'other', source: 'Other Online', paymentMethodId: '', amount: 0, isEditable: false },
      ];

      // Map database sales entries to our structure
      if (salesData) {
        for (const entry of salesData) {
          const methodName = (entry.payment_methods?.name || '').toLowerCase();
          const methodType = entry.method_type || '';
          
          let targetId = 'other';
          if (entry.is_cash || methodType === 'cash') targetId = 'cash';
          else if (methodName.includes('upi') || methodType === 'upi') targetId = 'upi';
          else if (methodName.includes('swiggy') || methodType === 'aggregator_swiggy') targetId = 'swiggy';
          else if (methodName.includes('zomato') || methodType === 'aggregator_zomato') targetId = 'zomato';

          const salesRow = sales.find(s => s.id === targetId);
          if (salesRow) {
            salesRow.amount += entry.net_amount || 0;
            salesRow.paymentMethodId = entry.payment_method_id;
          }
        }
      }

      // 7. Build expense rows - determine cash vs online from expense_payments
      const cashExpenses: ExpenseRow[] = [];
      const onlineExpenses: ExpenseRow[] = [];

      if (expensesData) {
        for (const exp of expensesData) {
          const payments = exp.expense_payments || [];
          const isCash = payments.length === 0 || payments.some(p => p.is_cash);
          
          const row: ExpenseRow = {
            id: exp.id,
            description: exp.description || '',
            amount: exp.amount || 0,
            isCash,
            categoryId: exp.category_id || undefined,
            vendorId: exp.vendor_id || undefined,
          };

          if (isCash) {
            cashExpenses.push(row);
          } else {
            onlineExpenses.push(row);
          }
        }
      }

      // 8. Calculate totals
      const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
      const cashSales = sales.find(s => s.id === 'cash')?.amount || 0;
      const totalCashExpenses = cashExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalOnlineExpenses = onlineExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = totalCashExpenses + totalOnlineExpenses;

      // Use stored opening cash from the log (may have been manually entered)
      const storedOpeningCash = existingLog.opening_cash ?? openingCash;
      const expectedCash = storedOpeningCash + cashSales - totalCashExpenses;
      const actualCash = existingLog.actual_closing || 0;

      // ✅ CORRECT FORMULA: Difference = Actual - Expected
      // Positive = Excess (more cash than expected)
      // Negative = Short (less cash than expected)
      // Zero = Matched
      const difference = actualCash - expectedCash;

      // 9. Return complete data
      return {
        id: existingLog.id,
        shopId,
        shopCode,
        shopName,
        logDate,
        status: (existingLog.status === 'locked' ? 'draft' : existingLog.status) || 'draft',

        sales,
        totalSales,

        cashExpenses,
        onlineExpenses,
        totalCashExpenses,
        totalOnlineExpenses,
        totalExpenses,

        cashRecon: {
          openingCash: storedOpeningCash,
          todaysCash: cashSales,
          todaysExpense: totalCashExpenses,
          expectedCash,
          actualCash,
          difference, // ✅ Now correctly: AC - EC
          isOpeningEditable: hasNoPreviousData,
        },

        lastSavedAt: existingLog.updated_at || undefined,
      };
    },
    enabled: !!shopId && !!logDate,
  });
}

// ============================================
// SAVE DAILY REGISTER
// ============================================

interface SaveResult {
  success: boolean;
  logId: string;
  message: string;
}

// Profile type for the query
interface ProfileWithOrg {
  org_id: string | null;
}

// Profile with role for audit logging
interface ProfileWithRole {
  org_id: string | null;
  name: string | null;
  role_id: string | null;
  roles: { name: string } | null;
}

export function useSaveDailyRegister() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DailyRegisterData): Promise<SaveResult> => {
      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Not authenticated');

      // Get user's org_id and role from profile for audit logging
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('org_id, name, role_id, roles(name)')
        .eq('id', user.id)
        .single<ProfileWithRole>();

      if (profileError) throw profileError;
      if (!profileData?.org_id) throw new Error('User has no organization');

      const orgId = profileData.org_id;
      const userName = profileData.name || user.email || 'Unknown';
      const userRole = (profileData.roles as { name: string } | null)?.name || 'Unknown';

      // ✅ CORRECT FORMULA for variance: Actual - Expected
      const variance = data.cashRecon.actualCash - data.cashRecon.expectedCash;

      // 1. Upsert daily_sales_logs
      const logPayload = {
        org_id: orgId,
        shop_id: data.shopId,
        log_date: data.logDate,
        opening_cash: data.cashRecon.openingCash,
        gross_sales: data.totalSales,
        net_sales: data.totalSales,
        cash_sales: data.cashRecon.todaysCash,
        total_cash_expenses: data.totalCashExpenses,
        total_online_expenses: data.totalOnlineExpenses,
        expected_closing: data.cashRecon.expectedCash,
        actual_closing: data.cashRecon.actualCash,
        variance: variance, // ✅ Correct: AC - EC
        status: data.status,
        logged_by: user.id,
      };

      let logId: string;
      const isUpdate = !!data.id;

      if (data.id) {
        // Update existing
        logId = data.id;
        const { error } = await (supabase.from('daily_sales_logs') as any)
          .update(logPayload)
          .eq('id', logId);

        if (error) throw error;
      } else {
        // Insert new
        const { data: newLogData, error } = await (supabase.from('daily_sales_logs') as any)
          .insert(logPayload)
          .select('id')
          .single();

        if (error) throw error;
        if (!newLogData) throw new Error('Failed to create log');
        logId = (newLogData as any).id;
      }

      // 2. Delete existing sales entries and re-insert
      await supabase
        .from('sales_entries')
        .delete()
        .eq('daily_log_id', logId);

      // Fetch payment methods to get IDs and method_types
      type PaymentMethodRow = { id: string; name: string; method_type: string };
      const { data: paymentMethods } = await supabase
        .from('payment_methods')
        .select('id, name, method_type')
        .eq('is_active', true)
        .returns<PaymentMethodRow[]>();

      const getPaymentMethodInfo = (source: string): { id: string | null; methodType: string; isCash: boolean } => {
        if (!paymentMethods) return { id: null, methodType: 'cash', isCash: true };
        
        const sourceLower = source.toLowerCase();
        const pm = paymentMethods.find(p => 
          p.name.toLowerCase().includes(sourceLower) ||
          (sourceLower === 'cash' && p.method_type === 'cash')
        );
        
        if (!pm) {
          if (sourceLower === 'cash') return { id: null, methodType: 'cash', isCash: true };
          if (sourceLower === 'upi') return { id: null, methodType: 'upi', isCash: false };
          if (sourceLower === 'swiggy') return { id: null, methodType: 'aggregator_swiggy', isCash: false };
          if (sourceLower === 'zomato') return { id: null, methodType: 'aggregator_zomato', isCash: false };
          return { id: null, methodType: 'online', isCash: false };
        }
        
        return { 
          id: pm.id, 
          methodType: pm.method_type,
          isCash: pm.method_type === 'cash'
        };
      };

      // Insert sales entries (only non-zero with valid payment method)
      for (const s of data.sales) {
        if (s.amount <= 0) continue;
        
        const pmInfo = getPaymentMethodInfo(s.source);
        const paymentMethodId = pmInfo.id || s.paymentMethodId;
        
        if (!paymentMethodId) {
          console.warn(`No payment method found for ${s.source}, skipping`);
          continue;
        }
        
        await (supabase.from('sales_entries') as any)
          .insert({
            daily_log_id: logId,
            entry_date: data.logDate,
            payment_method_id: paymentMethodId,
            method_type: pmInfo.methodType,
            is_cash: pmInfo.isCash,
            gross_amount: s.amount,
            returns_amount: 0,
            net_amount: s.amount,
          });
      }

      // 3. Handle expenses - delete old and insert new
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('daily_log_id', logId)
        .returns<{ id: string }[]>();
      
      if (existingExpenses && existingExpenses.length > 0) {
        for (const exp of existingExpenses) {
          await supabase
            .from('expense_payments')
            .delete()
            .eq('expense_id', exp.id);
        }
      }

      // Delete expenses linked to this daily log
      await supabase
        .from('expenses')
        .delete()
        .eq('daily_log_id', logId);

      // Get default expense category
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .limit(1)
        .returns<{ id: string }[]>();

      const defaultCategoryId = categories?.[0]?.id;

      // Get default payment methods for cash and bank
      const { data: cashPM } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('org_id', orgId)
        .eq('method_type', 'cash')
        .eq('for_expenses', true)
        .limit(1)
        .returns<{ id: string }[]>();

      const { data: bankPM } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('org_id', orgId)
        .eq('method_type', 'bank')
        .eq('for_expenses', true)
        .limit(1)
        .returns<{ id: string }[]>();

      const cashPaymentMethodId = cashPM?.[0]?.id;
      const bankPaymentMethodId = bankPM?.[0]?.id;

      // Helper to create expense with payment
      const createExpenseWithPayment = async (expense: ExpenseRow, isCash: boolean) => {
        if (!expense.description || expense.amount <= 0) return;
        if (!defaultCategoryId) {
          console.warn('No default expense category, skipping expense');
          return;
        }

        const { data: newExpenseData, error: expError } = await (supabase.from('expenses') as any)
          .insert({
            org_id: orgId,
            shop_id: data.shopId,
            daily_log_id: logId,
            expense_date: data.logDate,
            category_id: expense.categoryId || defaultCategoryId,
            description: expense.description,
            amount: expense.amount,
            payment_status: 'paid',
            created_by: user.id,
          })
          .select('id')
          .single();

        if (expError) {
          console.error('Expense error:', expError);
          throw expError;
        }

        const newExpenseId = (newExpenseData as any)?.id;
        const paymentMethodId = isCash ? cashPaymentMethodId : bankPaymentMethodId;
        
        if (newExpenseId && paymentMethodId) {
          const { error: payError } = await (supabase.from('expense_payments') as any)
            .insert({
              expense_id: newExpenseId,
              payment_method_id: paymentMethodId,
              method_type: isCash ? 'cash' : 'bank',
              is_cash: isCash,
              amount: expense.amount,
              payment_date: data.logDate,
            });

          if (payError) {
            console.error('Payment error:', payError);
          }
        }
      };

      // Create cash expenses
      for (const expense of data.cashExpenses) {
        await createExpenseWithPayment(expense, true);
      }

      // Create online expenses
      for (const expense of data.onlineExpenses) {
        await createExpenseWithPayment(expense, false);
      }

      // 4. ✅ ENHANCED AUDIT LOGGING - replaces manual Name/Signature
      try {
        await (supabase.from('activity_logs') as any).insert({
          org_id: orgId,
          user_id: user.id,
          action: isUpdate ? 'record.update' : 'record.create',
          entity_type: 'daily_sales_log',
          entity_id: logId,
          entity_name: `${data.shopCode} - ${data.logDate}`,
          shop_id: data.shopId,
          metadata: {
            // ✅ Auto-captured user info (replaces Name/Signature)
            filled_by_name: userName,
            filled_by_role: userRole,
            filled_by_email: user.email,
            timestamp: new Date().toISOString(),
            action_type: isUpdate ? 'edited' : 'created',
            
            // Business data
            total_sales: data.totalSales,
            total_expenses: data.totalExpenses,
            cash_sales: data.cashRecon.todaysCash,
            cash_expenses: data.cashRecon.todaysExpense,
            opening_cash: data.cashRecon.openingCash,
            expected_cash: data.cashRecon.expectedCash,
            actual_cash: data.cashRecon.actualCash,
            variance: variance,
            variance_type: variance > 0 ? 'excess' : variance < 0 ? 'short' : 'matched',
          },
        });
      } catch (activityError) {
        console.warn('Activity log failed (non-critical):', activityError);
      }

      return {
        success: true,
        logId: logId,
        message: 'Saved successfully',
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['daily-register', variables.shopId, variables.logDate] 
      });
    },
  });
}

// ============================================
// FETCH EXPENSE SUGGESTIONS
// ============================================

export function useExpenseSuggestions() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['expense-suggestions'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('description')
        .not('description', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)
        .returns<{ description: string }[]>();

      if (error) throw error;

      const descriptions = (data || [])
        .map(e => e.description)
        .filter((d): d is string => Boolean(d));
      
      const unique = Array.from(new Set(descriptions));
      return unique.slice(0, 50);
    },
    staleTime: 5 * 60 * 1000,
  });
}