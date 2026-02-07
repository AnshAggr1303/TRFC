export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          is_transactional: boolean | null
          name: string
          normal_balance: string
          org_id: string
          parent_id: string | null
          shop_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          is_transactional?: boolean | null
          name: string
          normal_balance: string
          org_id: string
          parent_id?: string | null
          shop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          is_transactional?: boolean | null
          name?: string
          normal_balance?: string
          org_id?: string
          parent_id?: string | null
          shop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      activity_action_types: {
        Row: {
          category: string
          code: string
          description: string | null
          name: string
          severity: string | null
        }
        Insert: {
          category: string
          code: string
          description?: string | null
          name: string
          severity?: string | null
        }
        Update: {
          category?: string
          code?: string
          description?: string | null
          name?: string
          severity?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          changes: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: unknown
          logged_at: string | null
          metadata: Json | null
          org_id: string
          request_id: string | null
          shop_id: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          logged_at?: string | null
          metadata?: Json | null
          org_id: string
          request_id?: string | null
          shop_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          logged_at?: string | null
          metadata?: Json | null
          org_id?: string
          request_id?: string | null
          shop_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_action_fkey"
            columns: ["action"]
            isOneToOne: false
            referencedRelation: "activity_action_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "activity_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_recovery_logs: {
        Row: {
          advance_id: string
          amount: number
          created_at: string | null
          cumulative_recovered: number | null
          id: string
          notes: string | null
          payroll_id: string | null
          recovery_date: string
          remaining_after: number | null
        }
        Insert: {
          advance_id: string
          amount: number
          created_at?: string | null
          cumulative_recovered?: number | null
          id?: string
          notes?: string | null
          payroll_id?: string | null
          recovery_date: string
          remaining_after?: number | null
        }
        Update: {
          advance_id?: string
          amount?: number
          created_at?: string | null
          cumulative_recovered?: number | null
          id?: string
          notes?: string | null
          payroll_id?: string | null
          recovery_date?: string
          remaining_after?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_recovery_logs_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "salary_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recovery_payroll"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_api_configs: {
        Row: {
          auth_type: string | null
          auto_sync_enabled: boolean | null
          base_url: string
          bearer_token: string | null
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          method: string | null
          name: string
          org_id: string
          query_params: Json | null
          response_mapping: Json | null
          shop_id: string | null
          sync_interval_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          auth_type?: string | null
          auto_sync_enabled?: boolean | null
          base_url: string
          bearer_token?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          method?: string | null
          name: string
          org_id: string
          query_params?: Json | null
          response_mapping?: Json | null
          shop_id?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          auth_type?: string | null
          auto_sync_enabled?: boolean | null
          base_url?: string
          bearer_token?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          method?: string | null
          name?: string
          org_id?: string
          query_params?: Json | null
          response_mapping?: Json | null
          shop_id?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_api_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_api_configs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_api_configs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          all_punches: string[] | null
          attendance_date: string
          created_at: string | null
          early_leave_minutes: number | null
          employee_id: string
          id: string
          is_manual_entry: boolean | null
          late_minutes: number | null
          manual_notes: string | null
          overtime_minutes: number | null
          punch_in: string | null
          punch_out: string | null
          status: string
          synced_from_api_id: string | null
          updated_at: string | null
          work_hours: number | null
        }
        Insert: {
          all_punches?: string[] | null
          attendance_date: string
          created_at?: string | null
          early_leave_minutes?: number | null
          employee_id: string
          id?: string
          is_manual_entry?: boolean | null
          late_minutes?: number | null
          manual_notes?: string | null
          overtime_minutes?: number | null
          punch_in?: string | null
          punch_out?: string | null
          status?: string
          synced_from_api_id?: string | null
          updated_at?: string | null
          work_hours?: number | null
        }
        Update: {
          all_punches?: string[] | null
          attendance_date?: string
          created_at?: string | null
          early_leave_minutes?: number | null
          employee_id?: string
          id?: string
          is_manual_entry?: boolean | null
          late_minutes?: number | null
          manual_notes?: string | null
          overtime_minutes?: number | null
          punch_in?: string | null
          punch_out?: string | null
          status?: string
          synced_from_api_id?: string | null
          updated_at?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "attendance_status_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "attendance_records_synced_from_api_id_fkey"
            columns: ["synced_from_api_id"]
            isOneToOne: false
            referencedRelation: "attendance_api_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_status_types: {
        Row: {
          code: string
          counts_as_present: number
          description: string | null
          is_active: boolean | null
          is_paid: boolean
          name: string
        }
        Insert: {
          code: string
          counts_as_present?: number
          description?: string | null
          is_active?: boolean | null
          is_paid?: boolean
          name: string
        }
        Update: {
          code?: string
          counts_as_present?: number
          description?: string | null
          is_active?: boolean | null
          is_paid?: boolean
          name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_id: string | null
          account_number: string | null
          bank_name: string | null
          branch: string | null
          created_at: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          opening_balance: number | null
          opening_balance_date: string | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          opening_balance?: number | null
          opening_balance_date?: string | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          opening_balance?: number | null
          opening_balance_date?: string | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inventory_entries: {
        Row: {
          closing_stock: number
          consumed: number
          created_at: string | null
          daily_log_id: string
          entry_date: string
          id: string
          item_id: string
          notes: string | null
          opening_stock: number
          received: number
          shop_id: string
        }
        Insert: {
          closing_stock?: number
          consumed?: number
          created_at?: string | null
          daily_log_id: string
          entry_date: string
          id?: string
          item_id: string
          notes?: string | null
          opening_stock?: number
          received?: number
          shop_id: string
        }
        Update: {
          closing_stock?: number
          consumed?: number
          created_at?: string | null
          daily_log_id?: string
          entry_date?: string
          id?: string
          item_id?: string
          notes?: string | null
          opening_stock?: number
          received?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_inventory_entries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_sales_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inventory_entries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "v_daily_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inventory_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inventory_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_central_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "daily_inventory_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "daily_inventory_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inventory_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      daily_sales_logs: {
        Row: {
          actual_closing: number | null
          cash_in: number | null
          cash_out: number | null
          cash_sales: number | null
          created_at: string | null
          expected_closing: number | null
          gross_sales: number | null
          id: string
          ledger_batch_id: string | null
          locked_at: string | null
          log_date: string
          logged_by: string | null
          net_sales: number | null
          notes: string | null
          opening_cash: number | null
          org_id: string
          shop_id: string
          status: Database["public"]["Enums"]["record_status"] | null
          total_cash_expenses: number | null
          total_items_counted: number | null
          total_online_expenses: number | null
          total_returns: number | null
          updated_at: string | null
          variance: number | null
          variance_reason: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_closing?: number | null
          cash_in?: number | null
          cash_out?: number | null
          cash_sales?: number | null
          created_at?: string | null
          expected_closing?: number | null
          gross_sales?: number | null
          id?: string
          ledger_batch_id?: string | null
          locked_at?: string | null
          log_date: string
          logged_by?: string | null
          net_sales?: number | null
          notes?: string | null
          opening_cash?: number | null
          org_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["record_status"] | null
          total_cash_expenses?: number | null
          total_items_counted?: number | null
          total_online_expenses?: number | null
          total_returns?: number | null
          updated_at?: string | null
          variance?: number | null
          variance_reason?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_closing?: number | null
          cash_in?: number | null
          cash_out?: number | null
          cash_sales?: number | null
          created_at?: string | null
          expected_closing?: number | null
          gross_sales?: number | null
          id?: string
          ledger_batch_id?: string | null
          locked_at?: string | null
          log_date?: string
          logged_by?: string | null
          net_sales?: number | null
          notes?: string | null
          opening_cash?: number | null
          org_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["record_status"] | null
          total_cash_expenses?: number | null
          total_items_counted?: number | null
          total_online_expenses?: number | null
          total_returns?: number | null
          updated_at?: string | null
          variance?: number | null
          variance_reason?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "daily_sales_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          aadhar_number: string | null
          address: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          base_salary: number
          created_at: string | null
          daily_rate: number | null
          designation: string | null
          email: string | null
          empcode_linked_at: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          exit_date: string | null
          external_empcode: string | null
          id: string
          join_date: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          shop_id: string
          status: string
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          base_salary: number
          created_at?: string | null
          daily_rate?: number | null
          designation?: string | null
          email?: string | null
          empcode_linked_at?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          exit_date?: string | null
          external_empcode?: string | null
          id?: string
          join_date: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          shop_id: string
          status?: string
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          base_salary?: number
          created_at?: string | null
          daily_rate?: number | null
          designation?: string | null
          email?: string | null
          empcode_linked_at?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          exit_date?: string | null
          external_empcode?: string | null
          id?: string
          join_date?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          shop_id?: string
          status?: string
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          parent_id: string | null
          shop_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          parent_id?: string | null
          shop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          parent_id?: string | null
          shop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      expense_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          due_date: string | null
          expense_id: string
          id: string
          is_cash: boolean
          method_type: string
          notes: string | null
          payment_date: string | null
          payment_method_id: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          due_date?: string | null
          expense_id: string
          id?: string
          is_cash?: boolean
          method_type: string
          notes?: string | null
          payment_date?: string | null
          payment_method_id: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          due_date?: string | null
          expense_id?: string
          id?: string
          is_cash?: boolean
          method_type?: string
          notes?: string | null
          payment_date?: string | null
          payment_method_id?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_method_type_fkey"
            columns: ["method_type"]
            isOneToOne: false
            referencedRelation: "payment_method_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "expense_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          created_by: string | null
          daily_log_id: string | null
          description: string
          expense_date: string
          id: string
          ledger_batch_id: string | null
          org_id: string
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          quantity: number | null
          rate: number | null
          receipt_url: string | null
          shop_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          created_by?: string | null
          daily_log_id?: string | null
          description: string
          expense_date?: string
          id?: string
          ledger_batch_id?: string | null
          org_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          quantity?: number | null
          rate?: number | null
          receipt_url?: string | null
          shop_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          daily_log_id?: string | null
          description?: string
          expense_date?: string
          id?: string
          ledger_batch_id?: string | null
          org_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          quantity?: number | null
          rate?: number | null
          receipt_url?: string | null
          shop_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_balances"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_daily_log"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_sales_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_daily_log"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "v_daily_operations_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          expense_account_id: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          expense_account_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          expense_account_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          available_at_shop_ids: string[] | null
          category_id: string | null
          code: string | null
          created_at: string | null
          default_shelf_life_days: number | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          inspection_frequency: string
          is_active: boolean | null
          min_stock_level: number | null
          name: string
          org_id: string
          reorder_level: number | null
          reorder_quantity: number | null
          standard_cost: number | null
          track_expiry: boolean | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          available_at_shop_ids?: string[] | null
          category_id?: string | null
          code?: string | null
          created_at?: string | null
          default_shelf_life_days?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          inspection_frequency?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          name: string
          org_id: string
          reorder_level?: number | null
          reorder_quantity?: number | null
          standard_cost?: number | null
          track_expiry?: boolean | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          available_at_shop_ids?: string[] | null
          category_id?: string | null
          code?: string | null
          created_at?: string | null
          default_shelf_life_days?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          inspection_frequency?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string
          org_id?: string
          reorder_level?: number | null
          reorder_quantity?: number | null
          standard_cost?: number | null
          track_expiry?: boolean | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated: number | null
          carried_forward: number | null
          created_at: string | null
          employee_id: string
          encashed: number | null
          finalized_at: string | null
          id: string
          is_finalized: boolean | null
          month: number
          opening_balance: number | null
          remaining: number | null
          updated_at: string | null
          used_paid: number | null
          used_unpaid: number | null
          year: number
        }
        Insert: {
          allocated?: number | null
          carried_forward?: number | null
          created_at?: string | null
          employee_id: string
          encashed?: number | null
          finalized_at?: string | null
          id?: string
          is_finalized?: boolean | null
          month: number
          opening_balance?: number | null
          remaining?: number | null
          updated_at?: string | null
          used_paid?: number | null
          used_unpaid?: number | null
          year: number
        }
        Update: {
          allocated?: number | null
          carried_forward?: number | null
          created_at?: string | null
          employee_id?: string
          encashed?: number | null
          finalized_at?: string | null
          id?: string
          is_finalized?: boolean | null
          month?: number
          opening_balance?: number | null
          remaining?: number | null
          updated_at?: string | null
          used_paid?: number | null
          used_unpaid?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          created_at: string | null
          deduct_extra_from_salary: boolean | null
          encash_unused: boolean | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_carryover: number | null
          name: string
          org_id: string
          paid_leaves_per_month: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deduct_extra_from_salary?: boolean | null
          encash_unused?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_carryover?: number | null
          name: string
          org_id: string
          paid_leaves_per_month?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deduct_extra_from_salary?: boolean | null
          encash_unused?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_carryover?: number | null
          name?: string
          org_id?: string
          paid_leaves_per_month?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          batch_id: string
          created_at: string | null
          created_by: string | null
          credit: number
          debit: number
          description: string | null
          entry_date: string
          id: string
          metadata: Json | null
          org_id: string
          shop_id: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          account_id: string
          batch_id: string
          created_at?: string | null
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_date: string
          id?: string
          metadata?: Json | null
          org_id: string
          shop_id?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          account_id?: string
          batch_id?: string
          created_at?: string | null
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          entry_date?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          shop_id?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      notification_configs: {
        Row: {
          alert_type: string
          conditions: Json | null
          cooldown_minutes: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notify_role_ids: string[] | null
          notify_user_ids: string[] | null
          org_id: string
          send_email: boolean | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notify_role_ids?: string[] | null
          notify_user_ids?: string[] | null
          org_id: string
          send_email?: boolean | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notify_role_ids?: string[] | null
          notify_user_ids?: string[] | null
          org_id?: string
          send_email?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          config_id: string | null
          created_at: string | null
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          org_id: string
          read_at: string | null
          severity: Database["public"]["Enums"]["notification_severity"] | null
          shop_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          config_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          org_id: string
          read_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"] | null
          shop_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          config_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          org_id?: string
          read_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"] | null
          shop_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "notification_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_method_types: {
        Row: {
          code: string
          commission_default: number | null
          description: string | null
          is_active: boolean | null
          is_cash: boolean
          is_online: boolean
          name: string
        }
        Insert: {
          code: string
          commission_default?: number | null
          description?: string | null
          is_active?: boolean | null
          is_cash?: boolean
          is_online?: boolean
          name: string
        }
        Update: {
          code?: string
          commission_default?: number | null
          description?: string | null
          is_active?: boolean | null
          is_cash?: boolean
          is_online?: boolean
          name?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_id: string | null
          code: string | null
          commission_percent: number | null
          created_at: string | null
          display_order: number | null
          for_expenses: boolean | null
          for_sales: boolean | null
          id: string
          is_active: boolean | null
          method_type: string
          name: string
          org_id: string
          shop_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          code?: string | null
          commission_percent?: number | null
          created_at?: string | null
          display_order?: number | null
          for_expenses?: boolean | null
          for_sales?: boolean | null
          id?: string
          is_active?: boolean | null
          method_type: string
          name: string
          org_id: string
          shop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          code?: string | null
          commission_percent?: number | null
          created_at?: string | null
          display_order?: number | null
          for_expenses?: boolean | null
          for_sales?: boolean | null
          id?: string
          is_active?: boolean | null
          method_type?: string
          name?: string
          org_id?: string
          shop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_method_type_fkey"
            columns: ["method_type"]
            isOneToOne: false
            referencedRelation: "payment_method_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payment_methods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      payroll_logs: {
        Row: {
          absent_days: number | null
          base_salary: number
          calculated_at: string | null
          calculated_by: string | null
          created_at: string | null
          deductions_absent: number | null
          deductions_advance: number | null
          deductions_extra_leaves: number | null
          deductions_late: number | null
          deductions_other: number | null
          deductions_total: number | null
          earnings_basic: number | null
          earnings_bonus: number | null
          earnings_leave_encashment: number | null
          earnings_other: number | null
          earnings_overtime: number | null
          earnings_total: number | null
          employee_designation: string | null
          employee_id: string
          employee_name: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          gross_pay: number | null
          half_days: number | null
          id: string
          late_days: number | null
          ledger_batch_id: string | null
          net_pay: number | null
          notes: string | null
          org_id: string
          overtime_minutes: number | null
          paid_at: string | null
          paid_by: string | null
          paid_leaves: number | null
          payment_method_id: string | null
          payment_reference: string | null
          period_end: string
          period_month: string
          period_start: string
          present_days: number | null
          status: Database["public"]["Enums"]["payroll_status"] | null
          total_days: number
          unpaid_leaves: number | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          absent_days?: number | null
          base_salary: number
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string | null
          deductions_absent?: number | null
          deductions_advance?: number | null
          deductions_extra_leaves?: number | null
          deductions_late?: number | null
          deductions_other?: number | null
          deductions_total?: number | null
          earnings_basic?: number | null
          earnings_bonus?: number | null
          earnings_leave_encashment?: number | null
          earnings_other?: number | null
          earnings_overtime?: number | null
          earnings_total?: number | null
          employee_designation?: string | null
          employee_id: string
          employee_name: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          gross_pay?: number | null
          half_days?: number | null
          id?: string
          late_days?: number | null
          ledger_batch_id?: string | null
          net_pay?: number | null
          notes?: string | null
          org_id: string
          overtime_minutes?: number | null
          paid_at?: string | null
          paid_by?: string | null
          paid_leaves?: number | null
          payment_method_id?: string | null
          payment_reference?: string | null
          period_end: string
          period_month: string
          period_start: string
          present_days?: number | null
          status?: Database["public"]["Enums"]["payroll_status"] | null
          total_days: number
          unpaid_leaves?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          absent_days?: number | null
          base_salary?: number
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string | null
          deductions_absent?: number | null
          deductions_advance?: number | null
          deductions_extra_leaves?: number | null
          deductions_late?: number | null
          deductions_other?: number | null
          deductions_total?: number | null
          earnings_basic?: number | null
          earnings_bonus?: number | null
          earnings_leave_encashment?: number | null
          earnings_other?: number | null
          earnings_overtime?: number | null
          earnings_total?: number | null
          employee_designation?: string | null
          employee_id?: string
          employee_name?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          gross_pay?: number | null
          half_days?: number | null
          id?: string
          late_days?: number | null
          ledger_batch_id?: string | null
          net_pay?: number | null
          notes?: string | null
          org_id?: string
          overtime_minutes?: number | null
          paid_at?: string | null
          paid_by?: string | null
          paid_leaves?: number | null
          payment_method_id?: string | null
          payment_reference?: string | null
          period_end?: string
          period_month?: string
          period_start?: string
          present_days?: number | null
          status?: Database["public"]["Enums"]["payroll_status"] | null
          total_days?: number
          unpaid_leaves?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_logs_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          org_id: string | null
          phone: string | null
          preferences: Json | null
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          org_id?: string | null
          phone?: string | null
          preferences?: Json | null
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          org_id?: string | null
          phone?: string | null
          preferences?: Json | null
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_punch_records: {
        Row: {
          api_config_id: string | null
          attendance_record_id: string | null
          empcode: string
          id: string
          org_id: string
          processed: boolean | null
          processed_at: string | null
          punch_date: string | null
          punch_time: string
          raw_data: Json | null
          synced_at: string | null
        }
        Insert: {
          api_config_id?: string | null
          attendance_record_id?: string | null
          empcode: string
          id?: string
          org_id: string
          processed?: boolean | null
          processed_at?: string | null
          punch_date?: string | null
          punch_time: string
          raw_data?: Json | null
          synced_at?: string | null
        }
        Update: {
          api_config_id?: string | null
          attendance_record_id?: string | null
          empcode?: string
          id?: string
          org_id?: string
          processed?: boolean | null
          processed_at?: string | null
          punch_date?: string | null
          punch_time?: string
          raw_data?: Json | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_punch_attendance"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_punch_records_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "attendance_api_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_punch_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          org_id: string
          permissions: Json | null
          shop_scope: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          org_id: string
          permissions?: Json | null
          shop_scope?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          org_id?: string
          permissions?: Json | null
          shop_scope?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          advance_date: string
          amount: number
          auto_deduct: boolean | null
          created_at: string | null
          employee_id: string
          given_by: string | null
          id: string
          installment_amount: number | null
          is_fully_recovered: boolean | null
          ledger_batch_id: string | null
          reason: string | null
          recovered_amount: number | null
          recovery_type: string
          remaining_amount: number | null
          total_installments: number | null
          updated_at: string | null
        }
        Insert: {
          advance_date?: string
          amount: number
          auto_deduct?: boolean | null
          created_at?: string | null
          employee_id: string
          given_by?: string | null
          id?: string
          installment_amount?: number | null
          is_fully_recovered?: boolean | null
          ledger_batch_id?: string | null
          reason?: string | null
          recovered_amount?: number | null
          recovery_type?: string
          remaining_amount?: number | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_date?: string
          amount?: number
          auto_deduct?: boolean | null
          created_at?: string | null
          employee_id?: string
          given_by?: string | null
          id?: string
          installment_amount?: number | null
          is_fully_recovered?: boolean | null
          ledger_batch_id?: string | null
          reason?: string | null
          recovered_amount?: number | null
          recovery_type?: string
          remaining_amount?: number | null
          total_installments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_entries: {
        Row: {
          commission_amount: number | null
          created_at: string | null
          daily_log_id: string
          entry_date: string
          gross_amount: number
          id: string
          is_cash: boolean
          method_type: string
          net_amount: number
          notes: string | null
          payment_method_id: string
          returns_amount: number
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string | null
          daily_log_id: string
          entry_date: string
          gross_amount?: number
          id?: string
          is_cash?: boolean
          method_type: string
          net_amount?: number
          notes?: string | null
          payment_method_id: string
          returns_amount?: number
        }
        Update: {
          commission_amount?: number | null
          created_at?: string | null
          daily_log_id?: string
          entry_date?: string
          gross_amount?: number
          id?: string
          is_cash?: boolean
          method_type?: string
          net_amount?: number
          notes?: string | null
          payment_method_id?: string
          returns_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_entries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_sales_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entries_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "v_daily_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entries_method_type_fkey"
            columns: ["method_type"]
            isOneToOne: false
            referencedRelation: "payment_method_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sales_entries_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          applicable_days: number[] | null
          created_at: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          schedule_type: string | null
          shift_id: string
        }
        Insert: {
          applicable_days?: number[] | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          schedule_type?: string | null
          shift_id: string
        }
        Update: {
          applicable_days?: number[] | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          schedule_type?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          created_at: string | null
          early_leave_grace_minutes: number | null
          end_time: string
          half_day_hours: number | null
          id: string
          is_active: boolean | null
          late_grace_minutes: number | null
          name: string
          org_id: string
          ot_rate_multiplier: number | null
          ot_threshold_minutes: number | null
          standard_hours: number
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string | null
          early_leave_grace_minutes?: number | null
          end_time: string
          half_day_hours?: number | null
          id?: string
          is_active?: boolean | null
          late_grace_minutes?: number | null
          name: string
          org_id: string
          ot_rate_multiplier?: number | null
          ot_threshold_minutes?: number | null
          standard_hours: number
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          created_at?: string | null
          early_leave_grace_minutes?: number | null
          end_time?: string
          half_day_hours?: number | null
          id?: string
          is_active?: boolean | null
          late_grace_minutes?: number | null
          name?: string
          org_id?: string
          ot_rate_multiplier?: number | null
          ot_threshold_minutes?: number | null
          standard_hours?: number
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          code: string
          created_at: string | null
          display_order: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          opening_time: string | null
          org_id: string
          phone: string | null
          pincode: string | null
          pos_system: string | null
          state: string | null
          updated_at: string | null
          weekly_off: number[] | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          code: string
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          opening_time?: string | null
          org_id: string
          phone?: string | null
          pincode?: string | null
          pos_system?: string | null
          state?: string | null
          updated_at?: string | null
          weekly_off?: number[] | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          code?: string
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          opening_time?: string | null
          org_id?: string
          phone?: string | null
          pincode?: string | null
          pos_system?: string | null
          state?: string | null
          updated_at?: string | null
          weekly_off?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          avg_cost: number | null
          created_at: string | null
          id: string
          item_id: string
          last_movement_at: string | null
          last_movement_type: string | null
          org_id: string
          quantity: number
          shop_id: string | null
          storeroom_id: string | null
          updated_at: string | null
        }
        Insert: {
          avg_cost?: number | null
          created_at?: string | null
          id?: string
          item_id: string
          last_movement_at?: string | null
          last_movement_type?: string | null
          org_id: string
          quantity?: number
          shop_id?: string | null
          storeroom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_cost?: number | null
          created_at?: string | null
          id?: string
          item_id?: string
          last_movement_at?: string | null
          last_movement_type?: string | null
          org_id?: string
          quantity?: number
          shop_id?: string | null
          storeroom_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_central_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "stock_levels_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "storerooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["storeroom_id"]
          },
        ]
      }
      stock_log_items: {
        Row: {
          amount: number
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          item_id: string
          manufacturing_date: string | null
          notes: string | null
          quantity: number
          rate: number
          stock_log_id: string
        }
        Insert: {
          amount?: number
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id: string
          manufacturing_date?: string | null
          notes?: string | null
          quantity: number
          rate?: number
          stock_log_id: string
        }
        Update: {
          amount?: number
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          manufacturing_date?: string | null
          notes?: string | null
          quantity?: number
          rate?: number
          stock_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_log_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_log_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_central_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_log_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_log_items_stock_log_id_fkey"
            columns: ["stock_log_id"]
            isOneToOne: false
            referencedRelation: "stock_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          expense_id: string | null
          from_shop_id: string | null
          from_storeroom_id: string | null
          id: string
          ledger_batch_id: string | null
          log_date: string
          log_number: string | null
          log_type: string
          notes: string | null
          org_id: string
          reference_number: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          to_shop_id: string | null
          to_storeroom_id: string | null
          total_amount: number | null
          total_items: number | null
          total_quantity: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expense_id?: string | null
          from_shop_id?: string | null
          from_storeroom_id?: string | null
          id?: string
          ledger_batch_id?: string | null
          log_date?: string
          log_number?: string | null
          log_type: string
          notes?: string | null
          org_id: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          to_shop_id?: string | null
          to_storeroom_id?: string | null
          total_amount?: number | null
          total_items?: number | null
          total_quantity?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expense_id?: string | null
          from_shop_id?: string | null
          from_storeroom_id?: string | null
          id?: string
          ledger_batch_id?: string | null
          log_date?: string
          log_number?: string | null
          log_type?: string
          notes?: string | null
          org_id?: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          to_shop_id?: string | null
          to_storeroom_id?: string | null
          total_amount?: number | null
          total_items?: number | null
          total_quantity?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_logs_expense"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_from_shop_id_fkey"
            columns: ["from_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_from_shop_id_fkey"
            columns: ["from_shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "stock_logs_from_storeroom_id_fkey"
            columns: ["from_storeroom_id"]
            isOneToOne: false
            referencedRelation: "storerooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_from_storeroom_id_fkey"
            columns: ["from_storeroom_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["storeroom_id"]
          },
          {
            foreignKeyName: "stock_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "stock_logs_to_storeroom_id_fkey"
            columns: ["to_storeroom_id"]
            isOneToOne: false
            referencedRelation: "storerooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_to_storeroom_id_fkey"
            columns: ["to_storeroom_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["storeroom_id"]
          },
          {
            foreignKeyName: "stock_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_balances"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "stock_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movement_types: {
        Row: {
          code: string
          description: string | null
          direction: number
          display_order: number | null
          is_active: boolean | null
          name: string
          requires_cost: boolean | null
          requires_reference: boolean | null
        }
        Insert: {
          code: string
          description?: string | null
          direction: number
          display_order?: number | null
          is_active?: boolean | null
          name: string
          requires_cost?: boolean | null
          requires_reference?: boolean | null
        }
        Update: {
          code?: string
          description?: string | null
          direction?: number
          display_order?: number | null
          is_active?: boolean | null
          name?: string
          requires_cost?: boolean | null
          requires_reference?: boolean | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          balance_after: number
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          expiry_date: string | null
          id: string
          item_id: string
          movement_date: string
          movement_type: string
          notes: string | null
          org_id: string
          quantity: number
          shop_id: string | null
          source_id: string | null
          source_type: string | null
          storeroom_id: string | null
          total_cost: number | null
        }
        Insert: {
          balance_after: number
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          item_id: string
          movement_date: string
          movement_type: string
          notes?: string | null
          org_id: string
          quantity: number
          shop_id?: string | null
          source_id?: string | null
          source_type?: string | null
          storeroom_id?: string | null
          total_cost?: number | null
        }
        Update: {
          balance_after?: number
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          org_id?: string
          quantity?: number
          shop_id?: string | null
          source_id?: string | null
          source_type?: string | null
          storeroom_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_central_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_movement_type_fkey"
            columns: ["movement_type"]
            isOneToOne: false
            referencedRelation: "stock_movement_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "stock_movements_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "storerooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["storeroom_id"]
          },
        ]
      }
      storeroom_shop_mappings: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          shop_id: string
          storeroom_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          shop_id: string
          storeroom_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          shop_id?: string
          storeroom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storeroom_shop_mappings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storeroom_shop_mappings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "storeroom_shop_mappings_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "storerooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storeroom_shop_mappings_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["storeroom_id"]
          },
        ]
      }
      storerooms: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storerooms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          abbreviation: string
          base_unit_id: string | null
          conversion_factor: number | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
        }
        Insert: {
          abbreviation: string
          base_unit_id?: string | null
          conversion_factor?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
        }
        Update: {
          abbreviation?: string
          base_unit_id?: string | null
          conversion_factor?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_of_measure_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unmapped_empcodes: {
        Row: {
          api_config_id: string | null
          empcode: string
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          mapped_at: string | null
          mapped_by: string | null
          mapped_to_employee_id: string | null
          name_from_api: string | null
          org_id: string
          punch_count: number | null
          status: string | null
        }
        Insert: {
          api_config_id?: string | null
          empcode: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          mapped_at?: string | null
          mapped_by?: string | null
          mapped_to_employee_id?: string | null
          name_from_api?: string | null
          org_id: string
          punch_count?: number | null
          status?: string | null
        }
        Update: {
          api_config_id?: string | null
          empcode?: string
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          mapped_at?: string | null
          mapped_by?: string | null
          mapped_to_employee_id?: string | null
          name_from_api?: string | null
          org_id?: string
          punch_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unmapped_empcodes_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "attendance_api_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unmapped_empcodes_mapped_by_fkey"
            columns: ["mapped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unmapped_empcodes_mapped_to_employee_id_fkey"
            columns: ["mapped_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unmapped_empcodes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_shop_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shop_assignments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_shop_assignments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "user_shop_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          is_preferred: boolean | null
          vendor_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          vendor_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_balances"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          code: string | null
          contact_person: string | null
          created_at: string | null
          credit_days: number | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          org_id: string
          pan: string | null
          phone: string | null
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_days?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          org_id: string
          pan?: string | null
          phone?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_days?: number | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          org_id?: string
          pan?: string | null
          phone?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wastage_logs: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          daily_log_id: string | null
          description: string | null
          id: string
          image_url: string | null
          item_id: string
          org_id: string
          quantity: number
          reason: string
          shop_id: string | null
          stock_movement_id: string | null
          storeroom_id: string | null
          total_cost: number | null
          wastage_date: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_log_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          item_id: string
          org_id: string
          quantity: number
          reason: string
          shop_id?: string | null
          stock_movement_id?: string | null
          storeroom_id?: string | null
          total_cost?: number | null
          wastage_date?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_log_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          item_id?: string
          org_id?: string
          quantity?: number
          reason?: string
          shop_id?: string | null
          stock_movement_id?: string | null
          storeroom_id?: string | null
          total_cost?: number | null
          wastage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wastage_daily_log"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_sales_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wastage_daily_log"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "v_daily_operations_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_central_stock"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "wastage_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "wastage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "wastage_logs_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "storerooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_storeroom_id_fkey"
            columns: ["storeroom_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["storeroom_id"]
          },
        ]
      }
    }
    Views: {
      v_cash_movements: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          direction: string | null
          id: string | null
          movement_date: string | null
          org_id: string | null
          shop_id: string | null
          shop_name: string | null
          source_id: string | null
          source_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      v_central_stock: {
        Row: {
          item_code: string | null
          item_id: string | null
          item_name: string | null
          org_id: string | null
          total_central_stock: number | null
          total_value: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_operations_summary: {
        Row: {
          created_at: string | null
          gross_profit: number | null
          id: string | null
          log_date: string | null
          logged_by_name: string | null
          net_sales: number | null
          org_id: string | null
          shop_code: string | null
          shop_id: string | null
          shop_name: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          total_expenses: number | null
          total_items_counted: number | null
          variance: number | null
          verified_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      v_low_stock_items: {
        Row: {
          current_stock: number | null
          item_code: string | null
          item_id: string | null
          item_name: string | null
          min_stock_level: number | null
          org_id: string | null
          reorder_level: number | null
          shop_id: string | null
          shop_name: string | null
          stock_status: string | null
          storeroom_id: string | null
          storeroom_name: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_notification_counts: {
        Row: {
          critical_count: number | null
          info_count: number | null
          total_unread: number | null
          user_id: string | null
          warning_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recent_activity: {
        Row: {
          action_category: string | null
          action_name: string | null
          changes: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string | null
          logged_at: string | null
          metadata: Json | null
          org_id: string | null
          shop_code: string | null
          shop_name: string | null
          user_name: string | null
          user_role: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shop_cash_balances: {
        Row: {
          cash_balance: number | null
          last_transaction_date: string | null
          shop_code: string | null
          shop_id: string | null
          shop_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_items"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      v_vendor_balances: {
        Row: {
          org_id: string | null
          outstanding_balance: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_payroll: {
        Args: {
          p_calculated_by?: string
          p_employee_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: string
      }
      calculate_payroll_batch: {
        Args: {
          p_calculated_by?: string
          p_org_id: string
          p_period_end: string
          p_period_start: string
          p_shop_id?: string
        }
        Returns: {
          employee_id: string
          employee_name: string
          net_pay: number
          payroll_id: string
          status: string
        }[]
      }
      can_access_shop: { Args: { p_shop_id: string }; Returns: boolean }
      cleanup_expired_notifications: { Args: never; Returns: number }
      create_ledger_batch: {
        Args: {
          p_created_by?: string
          p_entries: Json
          p_entry_date: string
          p_org_id: string
          p_shop_id: string
          p_source_id: string
          p_source_type: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_config_id?: string
          p_entity_id?: string
          p_entity_type?: string
          p_expires_at?: string
          p_message: string
          p_org_id: string
          p_severity?: Database["public"]["Enums"]["notification_severity"]
          p_shop_id?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      finalize_payroll: {
        Args: { p_payroll_id: string; p_verified_by: string }
        Returns: boolean
      }
      get_account_balance: {
        Args: {
          p_account_id: string
          p_as_of_date?: string
          p_shop_id?: string
        }
        Returns: number
      }
      get_fy_start: { Args: { for_date?: string }; Returns: string }
      get_fy_string: { Args: { for_date?: string }; Returns: string }
      get_opening_cash: {
        Args: { p_date: string; p_shop_id: string }
        Returns: number
      }
      get_opening_stock: {
        Args: { p_date: string; p_item_id: string; p_shop_id: string }
        Returns: number
      }
      get_stock_quantity: {
        Args: { p_item_id: string; p_shop_id?: string; p_storeroom_id?: string }
        Returns: number
      }
      has_permission: { Args: { p_permission: string }; Returns: boolean }
      is_ledger_write_trusted: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_changes?: Json
          p_entity_id: string
          p_entity_name?: string
          p_entity_type: string
          p_metadata?: Json
          p_org_id: string
          p_shop_id?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_payroll_paid: {
        Args: {
          p_paid_by: string
          p_payment_method_id?: string
          p_payment_reference?: string
          p_payroll_id: string
        }
        Returns: boolean
      }
      process_attendance_for_date: {
        Args: { p_date: string; p_org_id: string }
        Returns: number
      }
      process_daily_closing: {
        Args: { p_created_by: string; p_daily_log_id: string }
        Returns: string
      }
      record_stock_movement: {
        Args: {
          p_batch_number?: string
          p_cost_per_unit?: number
          p_created_by?: string
          p_expiry_date?: string
          p_item_id: string
          p_movement_date: string
          p_movement_type: string
          p_notes?: string
          p_org_id: string
          p_quantity: number
          p_shop_id: string
          p_source_id?: string
          p_source_type?: string
          p_storeroom_id: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_org_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      employment_type: "monthly" | "daily"
      notification_severity: "info" | "warning" | "critical"
      payment_status: "paid" | "partial" | "pending"
      payroll_status: "draft" | "finalized" | "paid"
      record_status: "draft" | "submitted" | "verified" | "locked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      employment_type: ["monthly", "daily"],
      notification_severity: ["info", "warning", "critical"],
      payment_status: ["paid", "partial", "pending"],
      payroll_status: ["draft", "finalized", "paid"],
      record_status: ["draft", "submitted", "verified", "locked"],
    },
  },
} as const
