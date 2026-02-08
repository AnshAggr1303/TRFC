'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

// Define types locally (no more dependency on deleted file)
type Shop = Database['public']['Tables']['shops']['Row'];
type DailySalesLog = Database['public']['Tables']['daily_sales_logs']['Row'];

export interface ShopOption {
  id: string;
  name: string;
  code: string;
}

export function useShops() {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['shops'],
    queryFn: async (): Promise<ShopOption[]> => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, code')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .returns<Pick<Shop, 'id' | 'name' | 'code'>[]>();
      
      if (error) throw error;
      
      return (data || []).map((shop) => ({
        id: shop.id,
        name: shop.name,
        code: shop.code,
      }));
    },
  });
}

export function useOpeningCash(shopId: string, date: string) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['opening-cash', shopId, date],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('daily_sales_logs')
        .select('actual_closing')
        .eq('shop_id', shopId)
        .lt('log_date', date)
        .order('log_date', { ascending: false })
        .limit(1)
        .returns<Pick<DailySalesLog, 'actual_closing'>[]>();
      
      if (error) throw error;
      
      return data?.[0]?.actual_closing ?? 0;
    },
    enabled: !!shopId && !!date,
  });
}

export function useExistingLog(shopId: string, date: string) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['existing-log', shopId, date],
    queryFn: async (): Promise<{ id: string; status: string } | null> => {
      const { data, error } = await supabase
        .from('daily_sales_logs')
        .select('id, status')
        .eq('shop_id', shopId)
        .eq('log_date', date)
        .returns<Pick<DailySalesLog, 'id' | 'status'>[]>();
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      return {
        id: data[0].id,
        status: data[0].status ?? 'draft',
      };
    },
    enabled: !!shopId && !!date,
  });
}