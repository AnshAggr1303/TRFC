-- ============================================================================
-- TRFC Schema v2.0 - Part 8: Row-Level Security (RLS)
-- ============================================================================
--
-- Supabase uses PostgreSQL's RLS for data access control.
-- These policies ensure users can only access data they're authorized to see.
--
-- POLICY PATTERNS:
-- 1. Organization isolation (multi-tenant)
-- 2. Shop-level access (managers see only their shops)
-- 3. Owner/Admin bypass (full access)
-- 4. Self-access (users can read/update their own profile)
--
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
    SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get current user's role name
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
    SELECT r.name 
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is Owner
CREATE OR REPLACE FUNCTION auth.is_owner()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name = 'Owner'
    )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user has a specific permission
CREATE OR REPLACE FUNCTION auth.has_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
BEGIN
    SELECT r.permissions INTO v_permissions
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid();
    
    -- Owner has all permissions
    IF v_permissions ? '*' THEN
        RETURN TRUE;
    END IF;
    
    -- Check exact permission
    IF v_permissions ? p_permission THEN
        RETURN TRUE;
    END IF;
    
    -- Check wildcard (e.g., "sales.*" for "sales.view")
    IF v_permissions ? (split_part(p_permission, '.', 1) || '.*') THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user can access a specific shop
CREATE OR REPLACE FUNCTION auth.can_access_shop(p_shop_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_shop_scope TEXT;
BEGIN
    -- Get user's shop scope from role
    SELECT r.shop_scope INTO v_shop_scope
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid();
    
    -- 'all' scope = access all shops
    IF v_shop_scope = 'all' THEN
        RETURN TRUE;
    END IF;
    
    -- 'assigned' scope = check user_shop_assignments
    RETURN EXISTS (
        SELECT 1 FROM user_shop_assignments
        WHERE user_id = auth.uid()
          AND shop_id = p_shop_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE storerooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE storeroom_shop_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shop_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_inventory_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmapped_empcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_punch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATION POLICIES
-- ============================================================================

-- Users can only see their own organization
CREATE POLICY org_select ON organizations
    FOR SELECT USING (id = auth.user_org_id());

-- Only owners can update organization
CREATE POLICY org_update ON organizations
    FOR UPDATE USING (id = auth.user_org_id() AND auth.is_owner());

-- ============================================================================
-- SHOP POLICIES
-- ============================================================================

-- Users see shops in their org that they can access
CREATE POLICY shops_select ON shops
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR auth.can_access_shop(id))
    );

-- Only owners can insert/update/delete shops
CREATE POLICY shops_insert ON shops
    FOR INSERT WITH CHECK (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY shops_update ON shops
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY shops_delete ON shops
    FOR DELETE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- ============================================================================
-- STOREROOM POLICIES
-- ============================================================================

CREATE POLICY storerooms_select ON storerooms
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY storerooms_insert ON storerooms
    FOR INSERT WITH CHECK (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY storerooms_update ON storerooms
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- ============================================================================
-- ROLE POLICIES
-- ============================================================================

-- All users can see roles in their org
CREATE POLICY roles_select ON roles
    FOR SELECT USING (org_id = auth.user_org_id());

-- Only owners can manage roles
CREATE POLICY roles_insert ON roles
    FOR INSERT WITH CHECK (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY roles_update ON roles
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- ============================================================================
-- PROFILE POLICIES
-- ============================================================================

-- Users can see profiles in their org
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (org_id = auth.user_org_id());

-- Users can update their own profile (limited fields)
CREATE POLICY profiles_update_self ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Owners can update any profile
CREATE POLICY profiles_update_owner ON profiles
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- ============================================================================
-- USER SHOP ASSIGNMENT POLICIES
-- ============================================================================

CREATE POLICY usa_select ON user_shop_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_shop_assignments.user_id
              AND p.org_id = auth.user_org_id()
        )
    );

CREATE POLICY usa_manage ON user_shop_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_shop_assignments.user_id
              AND p.org_id = auth.user_org_id()
        ) AND auth.is_owner()
    );

-- ============================================================================
-- FINANCIAL POLICIES
-- ============================================================================

-- Accounts: org-scoped read, owner-only write
CREATE POLICY accounts_select ON accounts
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY accounts_insert ON accounts
    FOR INSERT WITH CHECK (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY accounts_update ON accounts
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Payment methods: org-scoped
CREATE POLICY payment_methods_select ON payment_methods
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY payment_methods_manage ON payment_methods
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Expense categories
CREATE POLICY expense_categories_select ON expense_categories
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY expense_categories_manage ON expense_categories
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Vendors
CREATE POLICY vendors_select ON vendors
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY vendors_insert ON vendors
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND 
        auth.has_permission('vendors.create')
    );

CREATE POLICY vendors_update ON vendors
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND 
        auth.has_permission('vendors.edit')
    );

-- Bank accounts: sensitive - owner only for full access
CREATE POLICY bank_accounts_select ON bank_accounts
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR auth.has_permission('finance.view'))
    );

CREATE POLICY bank_accounts_manage ON bank_accounts
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Ledger: read-only for most, create only via function
CREATE POLICY ledger_select ON ledger_entries
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR auth.has_permission('ledger.view'))
    );

-- No direct INSERT policy - must use create_ledger_batch()

-- ============================================================================
-- INVENTORY POLICIES
-- ============================================================================

CREATE POLICY uom_select ON units_of_measure
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY uom_manage ON units_of_measure
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY inv_categories_select ON inventory_categories
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY inv_categories_manage ON inventory_categories
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY inv_items_select ON inventory_items
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY inv_items_insert ON inventory_items
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_permission('inventory.create')
    );

CREATE POLICY inv_items_update ON inventory_items
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_permission('inventory.edit')
    );

-- Stock levels: read based on location access
CREATE POLICY stock_levels_select ON stock_levels
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR 
         shop_id IS NULL OR  -- Storeroom stock visible to all
         auth.can_access_shop(shop_id))
    );

-- Stock movements: read-only (created by record_stock_movement)
CREATE POLICY stock_movements_select ON stock_movements
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR 
         shop_id IS NULL OR
         auth.can_access_shop(shop_id))
    );

-- Stock logs
CREATE POLICY stock_logs_select ON stock_logs
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR
         to_shop_id IS NULL OR
         auth.can_access_shop(to_shop_id))
    );

CREATE POLICY stock_logs_insert ON stock_logs
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_permission('inventory.create')
    );

-- Stock log items follow parent
CREATE POLICY stock_log_items_select ON stock_log_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stock_logs sl
            WHERE sl.id = stock_log_items.stock_log_id
              AND sl.org_id = auth.user_org_id()
        )
    );

CREATE POLICY stock_log_items_insert ON stock_log_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM stock_logs sl
            WHERE sl.id = stock_log_items.stock_log_id
              AND sl.org_id = auth.user_org_id()
              AND auth.has_permission('inventory.create')
        )
    );

-- Wastage logs
CREATE POLICY wastage_select ON wastage_logs
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR
         shop_id IS NULL OR
         auth.can_access_shop(shop_id))
    );

CREATE POLICY wastage_insert ON wastage_logs
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_permission('inventory.wastage') AND
        (shop_id IS NULL OR auth.can_access_shop(shop_id))
    );

-- ============================================================================
-- DAILY OPERATIONS POLICIES
-- ============================================================================

-- Expenses
CREATE POLICY expenses_select ON expenses
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR
         shop_id IS NULL OR
         auth.can_access_shop(shop_id))
    );

CREATE POLICY expenses_insert ON expenses
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_permission('expenses.create') AND
        (shop_id IS NULL OR auth.can_access_shop(shop_id))
    );

CREATE POLICY expenses_update ON expenses
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_permission('expenses.edit') AND
        (shop_id IS NULL OR auth.can_access_shop(shop_id))
    );

-- Expense payments follow parent
CREATE POLICY expense_payments_select ON expense_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_payments.expense_id
              AND e.org_id = auth.user_org_id()
        )
    );

CREATE POLICY expense_payments_insert ON expense_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id = expense_payments.expense_id
              AND e.org_id = auth.user_org_id()
              AND auth.has_permission('expenses.create')
        )
    );

-- Daily sales logs
CREATE POLICY dsl_select ON daily_sales_logs
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR auth.can_access_shop(shop_id))
    );

CREATE POLICY dsl_insert ON daily_sales_logs
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_permission('sales.create') AND
        auth.can_access_shop(shop_id)
    );

CREATE POLICY dsl_update ON daily_sales_logs
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_permission('sales.edit') AND
        auth.can_access_shop(shop_id) AND
        status IN ('draft', 'submitted')  -- Can't update verified/locked
    );

-- Sales entries follow parent
CREATE POLICY sales_entries_select ON sales_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM daily_sales_logs dsl
            WHERE dsl.id = sales_entries.daily_log_id
              AND dsl.org_id = auth.user_org_id()
              AND (auth.is_owner() OR auth.can_access_shop(dsl.shop_id))
        )
    );

CREATE POLICY sales_entries_insert ON sales_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM daily_sales_logs dsl
            WHERE dsl.id = sales_entries.daily_log_id
              AND dsl.org_id = auth.user_org_id()
              AND auth.has_permission('sales.create')
              AND auth.can_access_shop(dsl.shop_id)
        )
    );

-- Daily inventory entries follow parent
CREATE POLICY die_select ON daily_inventory_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM daily_sales_logs dsl
            WHERE dsl.id = daily_inventory_entries.daily_log_id
              AND dsl.org_id = auth.user_org_id()
        )
    );

CREATE POLICY die_insert ON daily_inventory_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM daily_sales_logs dsl
            WHERE dsl.id = daily_inventory_entries.daily_log_id
              AND dsl.org_id = auth.user_org_id()
              AND auth.has_permission('sales.create')
        )
    );

-- ============================================================================
-- HR & PAYROLL POLICIES
-- ============================================================================

-- Employees: sensitive data
CREATE POLICY employees_select ON employees
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR 
         auth.has_permission('employees.view') OR
         auth.can_access_shop(shop_id))
    );

CREATE POLICY employees_insert ON employees
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_permission('employees.create')
    );

CREATE POLICY employees_update ON employees
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_permission('employees.edit')
    );

-- Shifts
CREATE POLICY shifts_select ON shifts
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY shifts_manage ON shifts
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Shift assignments
CREATE POLICY shift_assignments_select ON shift_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = shift_assignments.employee_id
              AND e.org_id = auth.user_org_id()
        )
    );

-- Attendance API configs: sensitive
CREATE POLICY attendance_api_select ON attendance_api_configs
    FOR SELECT USING (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY attendance_api_manage ON attendance_api_configs
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Attendance records
CREATE POLICY attendance_select ON attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = attendance_records.employee_id
              AND e.org_id = auth.user_org_id()
              AND (auth.is_owner() OR auth.has_permission('attendance.view'))
        )
    );

-- Leave policies
CREATE POLICY leave_policies_select ON leave_policies
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY leave_policies_manage ON leave_policies
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Leave balances
CREATE POLICY leave_balances_select ON leave_balances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = leave_balances.employee_id
              AND e.org_id = auth.user_org_id()
        )
    );

-- Salary advances: highly sensitive
CREATE POLICY advances_select ON salary_advances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = salary_advances.employee_id
              AND e.org_id = auth.user_org_id()
              AND (auth.is_owner() OR auth.has_permission('payroll.view'))
        )
    );

CREATE POLICY advances_insert ON salary_advances
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = salary_advances.employee_id
              AND e.org_id = auth.user_org_id()
              AND auth.has_permission('payroll.advances')
        )
    );

-- Payroll: highly sensitive
CREATE POLICY payroll_select ON payroll_logs
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR auth.has_permission('payroll.view'))
    );

-- Payroll insert/update only via functions (no direct policy)

-- ============================================================================
-- SYSTEM TABLE POLICIES
-- ============================================================================

-- Activity logs: read-only
CREATE POLICY activity_select ON activity_logs
    FOR SELECT USING (
        org_id = auth.user_org_id() AND
        (auth.is_owner() OR auth.has_permission('audit.view'))
    );

-- Notification configs
CREATE POLICY notif_config_select ON notification_configs
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY notif_config_manage ON notification_configs
    FOR ALL USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Notifications: user can only see their own
CREATE POLICY notifications_select ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================
-- Supabase service_role bypasses RLS by default.
-- Server-side functions (Edge Functions, webhooks) use service_role for
-- operations that need full access.

COMMENT ON FUNCTION auth.user_org_id IS 'RLS helper: Returns current user organization ID';
COMMENT ON FUNCTION auth.is_owner IS 'RLS helper: Checks if current user has Owner role';
COMMENT ON FUNCTION auth.has_permission IS 'RLS helper: Checks if current user has specific permission';
COMMENT ON FUNCTION auth.can_access_shop IS 'RLS helper: Checks if current user can access specific shop';
