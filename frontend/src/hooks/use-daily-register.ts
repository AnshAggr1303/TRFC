'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import type { DailyRegisterData, ExpenseRow, SalesRow } from '@/types/daily-register';
import { createEmptyRegisterData } from '@/types/daily-register';

// Define explicit types from database
type DailySalesLog = Database['public']['Tables']['daily_sales_logs']['Row'];
type DailySalesLogInsert = Database['public']['Tables']['daily_sales_logs']['Insert'];
type SalesEntryInsert = Database['public']['Tables']['sales_entries']['Insert'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

// ============================================
// FETCH DAILY REGISTER (with related data)
// ============================================

export function useDailyRegister(shopId: string, shopCode: string, shopName: string, logDate: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['daily-register', shopId, logDate],
    queryFn: async (): Promise<DailyRegisterData> => {
      // 1. Try to fetch existing log
      const { data: logData, error: logError } = await supabase
        .from('daily_sales_logs')
        .select('*')
        .eq('shop_id', shopId)
        .eq('log_date', logDate)
        .returns<DailySalesLog[]>();

      if (logError) throw logError;

      const existingLog = logData?.[0] || null;

      // 2. Fetch opening cash (previous day's closing)
      const { data: prevLogData } = await supabase
        .from('daily_sales_logs')
        .select('actual_closing')
        .eq('shop_id', shopId)
        .lt('log_date', logDate)
        .order('log_date', { ascending: false })
        .limit(1)
        .returns<Pick<DailySalesLog, 'actual_closing'>[]>();

      const openingCash = prevLogData?.[0]?.actual_closing ?? 0;

      // 3. If no existing log, return empty data with opening cash
      if (!existingLog) {
        const emptyData = createEmptyRegisterData(shopId, shopCode, shopName, logDate);
        emptyData.cashRecon.openingCash = openingCash;
        emptyData.cashRecon.expectedCash = openingCash;
        return emptyData;
      }

      // 4. Fetch sales entries for this log
      const { data: salesData, error: salesError } = await supabase
        .from('sales_entries')
        .select('id, payment_method_id, gross_amount, returns_amount, net_amount, payment_methods(name, method_type)')
        .eq('daily_log_id', existingLog.id)
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // 5. Fetch expenses for this shop/date
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, description, amount, paid_via, category_id, vendor_id')
        .eq('shop_id', shopId)
        .eq('expense_date', logDate)
        .order('created_at', { ascending: true });

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
        salesData.forEach((entry: any) => {
          const methodName = entry.payment_methods?.name?.toLowerCase() || '';
          const methodType = entry.payment_methods?.method_type || '';
          
          let targetId = 'other';
          if (methodName.includes('cash') || methodType === 'cash') targetId = 'cash';
          else if (methodName.includes('upi')) targetId = 'upi';
          else if (methodName.includes('swiggy')) targetId = 'swiggy';
          else if (methodName.includes('zomato')) targetId = 'zomato';

          const salesRow = sales.find(s => s.id === targetId);
          if (salesRow) {
            salesRow.amount += entry.net_amount || 0;
            salesRow.paymentMethodId = entry.payment_method_id;
          }
        });
      }

      // 7. Build expense rows
      const cashExpenses: ExpenseRow[] = [];
      const onlineExpenses: ExpenseRow[] = [];

      if (expensesData) {
        expensesData.forEach((exp: any) => {
          const row: ExpenseRow = {
            id: exp.id,
            description: exp.description || '',
            amount: exp.amount || 0,
            isCash: exp.paid_via === 'cash',
            categoryId: exp.category_id || undefined,
            vendorId: exp.vendor_id || undefined,
          };

          if (exp.paid_via === 'cash') {
            cashExpenses.push(row);
          } else {
            onlineExpenses.push(row);
          }
        });
      }

      // 8. Calculate totals
      const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
      const cashSales = sales.find(s => s.id === 'cash')?.amount || 0;
      const totalCashExpenses = cashExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalOnlineExpenses = onlineExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = totalCashExpenses + totalOnlineExpenses;

      const expectedCash = openingCash + cashSales - totalCashExpenses;
      const actualCash = existingLog.actual_closing || 0;

      // 9. Return complete data
      return {
        id: existingLog.id,
        shopId,
        shopCode,
        shopName,
        logDate,
        status: (existingLog.status as DailyRegisterData['status']) || 'draft',

        sales,
        totalSales,

        cashExpenses,
        onlineExpenses,
        totalCashExpenses,
        totalOnlineExpenses,
        totalExpenses,

        cashRecon: {
          openingCash,
          todaysCash: cashSales,
          todaysExpense: totalCashExpenses,
          expectedCash,
          actualCash,
          difference: expectedCash - actualCash,
        },

        managerName: existingLog.notes || '',
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

export function useSaveDailyRegister() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DailyRegisterData): Promise<SaveResult> => {
      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Not authenticated');

      // Get user's org_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profileData?.org_id) throw new Error('User has no organization');

      const orgId = profileData.org_id;

      // 1. Upsert daily_sales_logs
      const logPayload: DailySalesLogInsert = {
        org_id: orgId,
        shop_id: data.shopId,
        log_date: data.logDate,
        opening_cash: data.cashRecon.openingCash,
        gross_sales: data.totalSales,
        net_sales: data.totalSales,
        cash_sales: data.cashRecon.todaysCash,
        total_expenses: data.totalExpenses,
        expected_closing: data.cashRecon.expectedCash,
        actual_closing: data.cashRecon.actualCash,
        variance: data.cashRecon.difference,
        status: data.status,
        notes: data.managerName,
        logged_by: user.id,
      };

      let logId = data.id;

      if (logId) {
        // Update existing
        const { error } = await supabase
          .from('daily_sales_logs')
          .update(logPayload)
          .eq('id', logId);

        if (error) throw error;
      } else {
        // Insert new
        const { data: newLogData, error } = await supabase
          .from('daily_sales_logs')
          .insert(logPayload)
          .select('id')
          .single();

        if (error) throw error;
        if (!newLogData) throw new Error('Failed to create log');
        logId = newLogData.id;
      }

      // 2. Delete existing sales entries and re-insert
      if (logId) {
        await supabase
          .from('sales_entries')
          .delete()
          .eq('daily_log_id', logId);
      }

      // Fetch payment method IDs
      const { data: paymentMethods } = await supabase
        .from('payment_methods')
        .select('id, name, method_type')
        .eq('is_active', true);

      const getPaymentMethodId = (source: string): string | null => {
        if (!paymentMethods) return null;
        const pm = paymentMethods.find((p: any) => 
          p.name.toLowerCase().includes(source.toLowerCase()) ||
          (source === 'Cash' && p.method_type === 'cash')
        );
        return pm?.id || null;
      };

      // Insert sales entries (only non-zero)
      const salesEntries: SalesEntryInsert[] = data.sales
        .filter(s => s.amount > 0)
        .map(s => ({
          org_id: orgId,
          daily_log_id: logId!,
          payment_method_id: getPaymentMethodId(s.source),
          gross_amount: s.amount,
          returns_amount: 0,
          net_amount: s.amount,
        }));

      if (salesEntries.length > 0) {
        const { error: salesError } = await supabase
          .from('sales_entries')
          .insert(salesEntries);

        if (salesError) throw salesError;
      }

      // 3. Handle expenses - delete old and insert new
      await supabase
        .from('expenses')
        .delete()
        .eq('shop_id', data.shopId)
        .eq('expense_date', data.logDate)
        .eq('logged_by', user.id);

      // Get default expense category
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('org_id', orgId)
        .limit(1);

      const defaultCategoryId = categories?.[0]?.id || null;

      // Prepare expenses
      const cashExpensesToInsert: ExpenseInsert[] = data.cashExpenses
        .filter(e => e.description && e.amount > 0)
        .map(e => ({
          org_id: orgId,
          shop_id: data.shopId,
          expense_date: data.logDate,
          category_id: e.categoryId || defaultCategoryId,
          description: e.description,
          amount: e.amount,
          paid_via: 'cash' as const,
          logged_by: user.id,
        }));

      const onlineExpensesToInsert: ExpenseInsert[] = data.onlineExpenses
        .filter(e => e.description && e.amount > 0)
        .map(e => ({
          org_id: orgId,
          shop_id: data.shopId,
          expense_date: data.logDate,
          category_id: e.categoryId || defaultCategoryId,
          description: e.description,
          amount: e.amount,
          paid_via: 'bank' as const,
          logged_by: user.id,
        }));

      const allExpenses = [...cashExpensesToInsert, ...onlineExpensesToInsert];

      if (allExpenses.length > 0) {
        const { error: expError } = await supabase
          .from('expenses')
          .insert(allExpenses);

        if (expError) throw expError;
      }

      // 4. Log activity
      const activityPayload: ActivityLogInsert = {
        org_id: orgId,
        user_id: user.id,
        action: data.id ? 'update' : 'create',
        entity_type: 'daily_sales_log',
        entity_id: logId!,
        description: `Daily register ${data.id ? 'updated' : 'created'} for ${data.shopCode} on ${data.logDate}`,
        metadata: {
          total_sales: data.totalSales,
          total_expenses: data.totalExpenses,
          variance: data.cashRecon.difference,
        },
      };

      await supabase.from('activity_logs').insert(activityPayload);

      return {
        success: true,
        logId: logId!,
        message: 'Saved successfully',
      };
    },
    onSuccess: (_result, variables) => {
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
        .limit(100);

      if (error) throw error;

      // Get unique values using Array.from instead of spread
      const descriptions = (data || [])
        .map((e: any) => e.description)
        .filter((d: any): d is string => Boolean(d));
      
      const unique = Array.from(new Set(descriptions));
      return unique.slice(0, 50);
    },
    staleTime: 5 * 60 * 1000,
  });
}