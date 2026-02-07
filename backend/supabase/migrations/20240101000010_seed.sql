-- ============================================================================
-- TRFC Schema v2.0 - Part 9: Seed Data
-- ============================================================================
--
-- Initial data for The Rolling Foods Co.
-- Run this AFTER all schema files (001-008).
--
-- This creates:
-- 1. Organization: TRFC
-- 2. Roles: Owner, Manager, Cashier, Storekeeper, Viewer
-- 3. Units of Measure
-- 4. Shops: TRK, TRS, TFC, TRJ
-- 5. Storerooms and mappings
-- 6. Chart of Accounts (basic structure)
-- 7. Payment Methods
-- 8. Leave Policy
-- 9. Default Shift
--
-- ============================================================================

-- Use a fixed UUID for the organization (makes testing easier)
-- In production, you might generate this dynamically
DO $$
DECLARE
    v_org_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    -- Shops
    v_shop_trk UUID;
    v_shop_trs UUID;
    v_shop_tfc UUID;
    v_shop_trj UUID;
    
    -- Storerooms
    v_storeroom_main UUID;
    v_storeroom_jaipur UUID;
    
    -- Roles
    v_role_owner UUID;
    v_role_manager UUID;
    v_role_cashier UUID;
    v_role_storekeeper UUID;
    v_role_viewer UUID;
    
    -- Account IDs (for reference)
    v_acc_cash UUID;
    v_acc_bank UUID;
    v_acc_receivables UUID;
    v_acc_payables UUID;
    v_acc_owner_equity UUID;
    v_acc_sales UUID;
    v_acc_raw_materials UUID;
    v_acc_salaries UUID;
    v_acc_rent UUID;
    v_acc_utilities UUID;
    
BEGIN
    -- =========================================================================
    -- 1. ORGANIZATION
    -- =========================================================================
    INSERT INTO organizations (id, name, code, settings)
    VALUES (
        v_org_id,
        'The Rolling Foods Co.',
        'TRFC',
        '{
            "currency": "INR",
            "timezone": "Asia/Kolkata",
            "financial_year_start_month": 4,
            "cash_variance_threshold": 500,
            "date_format": "DD/MM/YYYY",
            "late_penalty_after_days": 3,
            "late_penalty_amount": 50
        }'::jsonb
    ) ON CONFLICT (id) DO NOTHING;
    
    -- =========================================================================
    -- 2. ROLES
    -- =========================================================================
    
    -- Owner: Full access
    INSERT INTO roles (id, org_id, name, description, permissions, shop_scope, is_system_role)
    VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Owner',
        'Full system access. Cannot be deleted.',
        '["*"]'::jsonb,
        'all',
        true
    )
    RETURNING id INTO v_role_owner;
    
    -- Manager: Shop-level management
    INSERT INTO roles (id, org_id, name, description, permissions, shop_scope)
    VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Manager',
        'Can manage daily operations for assigned shops.',
        '[
            "dashboard.view",
            "sales.view", "sales.create", "sales.edit", "sales.verify",
            "expenses.view", "expenses.create", "expenses.edit",
            "inventory.view", "inventory.create", "inventory.wastage",
            "employees.view",
            "attendance.view",
            "reports.view"
        ]'::jsonb,
        'assigned'
    )
    RETURNING id INTO v_role_manager;
    
    -- Cashier: Daily closing only
    INSERT INTO roles (id, org_id, name, description, permissions, shop_scope)
    VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Cashier',
        'Can log daily sales and expenses.',
        '[
            "dashboard.view",
            "sales.view", "sales.create",
            "expenses.view", "expenses.create"
        ]'::jsonb,
        'assigned'
    )
    RETURNING id INTO v_role_cashier;
    
    -- Storekeeper: Inventory focus
    INSERT INTO roles (id, org_id, name, description, permissions, shop_scope)
    VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Storekeeper',
        'Manages central inventory and transfers.',
        '[
            "dashboard.view",
            "inventory.view", "inventory.create", "inventory.edit", "inventory.wastage",
            "vendors.view"
        ]'::jsonb,
        'all'
    )
    RETURNING id INTO v_role_storekeeper;
    
    -- Viewer: Read-only
    INSERT INTO roles (id, org_id, name, description, permissions, shop_scope)
    VALUES (
        uuid_generate_v4(),
        v_org_id,
        'Viewer',
        'Read-only access to reports and data.',
        '[
            "dashboard.view",
            "sales.view",
            "expenses.view",
            "inventory.view",
            "reports.view"
        ]'::jsonb,
        'assigned'
    )
    RETURNING id INTO v_role_viewer;
    
    -- =========================================================================
    -- 3. UNITS OF MEASURE
    -- =========================================================================
    INSERT INTO units_of_measure (org_id, name, abbreviation, display_order) VALUES
        (v_org_id, 'Kilogram', 'kg', 1),
        (v_org_id, 'Gram', 'g', 2),
        (v_org_id, 'Litre', 'L', 3),
        (v_org_id, 'Millilitre', 'ml', 4),
        (v_org_id, 'Piece', 'pcs', 5),
        (v_org_id, 'Packet', 'pkt', 6),
        (v_org_id, 'Box', 'box', 7),
        (v_org_id, 'Dozen', 'dz', 8),
        (v_org_id, 'Crate', 'crate', 9),
        (v_org_id, 'Cylinder', 'cyl', 10);
    
    -- Set up gram → kg conversion
    UPDATE units_of_measure 
    SET base_unit_id = (SELECT id FROM units_of_measure WHERE org_id = v_org_id AND abbreviation = 'kg'),
        conversion_factor = 0.001
    WHERE org_id = v_org_id AND abbreviation = 'g';
    
    -- Set up ml → L conversion
    UPDATE units_of_measure 
    SET base_unit_id = (SELECT id FROM units_of_measure WHERE org_id = v_org_id AND abbreviation = 'L'),
        conversion_factor = 0.001
    WHERE org_id = v_org_id AND abbreviation = 'ml';
    
    -- =========================================================================
    -- 4. SHOPS
    -- =========================================================================
    INSERT INTO shops (id, org_id, name, code, city, opening_time, closing_time, weekly_off, display_order)
    VALUES
        (uuid_generate_v4(), v_org_id, 'The Rolling Kitchen', 'TRK', 'Main City', '09:00', '22:00', ARRAY[0], 1),
        (uuid_generate_v4(), v_org_id, 'The Rolling Shawarma', 'TRS', 'Main City', '11:00', '23:00', ARRAY[0], 2),
        (uuid_generate_v4(), v_org_id, 'The Food Court Co.', 'TFC', 'Main City', '10:00', '22:00', ARRAY[0], 3),
        (uuid_generate_v4(), v_org_id, 'The Rolling Jaipur', 'TRJ', 'Jaipur', '10:00', '23:00', ARRAY[0], 4);
    
    -- Get shop IDs
    SELECT id INTO v_shop_trk FROM shops WHERE org_id = v_org_id AND code = 'TRK';
    SELECT id INTO v_shop_trs FROM shops WHERE org_id = v_org_id AND code = 'TRS';
    SELECT id INTO v_shop_tfc FROM shops WHERE org_id = v_org_id AND code = 'TFC';
    SELECT id INTO v_shop_trj FROM shops WHERE org_id = v_org_id AND code = 'TRJ';
    
    -- =========================================================================
    -- 5. STOREROOMS
    -- =========================================================================
    INSERT INTO storerooms (id, org_id, name, code, city)
    VALUES
        (uuid_generate_v4(), v_org_id, 'Main City Storeroom', 'SR-MAIN', 'Main City'),
        (uuid_generate_v4(), v_org_id, 'Jaipur Storeroom', 'SR-JPR', 'Jaipur');
    
    -- Get storeroom IDs
    SELECT id INTO v_storeroom_main FROM storerooms WHERE org_id = v_org_id AND code = 'SR-MAIN';
    SELECT id INTO v_storeroom_jaipur FROM storerooms WHERE org_id = v_org_id AND code = 'SR-JPR';
    
    -- Storeroom-Shop mappings
    INSERT INTO storeroom_shop_mappings (storeroom_id, shop_id, is_primary) VALUES
        (v_storeroom_main, v_shop_trk, true),
        (v_storeroom_main, v_shop_trs, true),
        (v_storeroom_main, v_shop_tfc, true),
        (v_storeroom_jaipur, v_shop_trj, true);
    
    -- =========================================================================
    -- 6. CHART OF ACCOUNTS
    -- =========================================================================
    
    -- ASSETS (1xxx)
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, is_transactional, is_system)
    VALUES (uuid_generate_v4(), v_org_id, '1000', 'Assets', 'asset', 'debit', false, true)
    RETURNING id INTO v_acc_cash;
    
    -- Cash accounts per shop
    INSERT INTO accounts (org_id, code, name, account_type, normal_balance, parent_id, shop_id, is_system)
    VALUES
        (v_org_id, '1101', 'Cash - TRK', 'asset', 'debit', v_acc_cash, v_shop_trk, true),
        (v_org_id, '1102', 'Cash - TRS', 'asset', 'debit', v_acc_cash, v_shop_trs, true),
        (v_org_id, '1103', 'Cash - TFC', 'asset', 'debit', v_acc_cash, v_shop_tfc, true),
        (v_org_id, '1104', 'Cash - TRJ', 'asset', 'debit', v_acc_cash, v_shop_trj, true);
    
    -- Bank account (header)
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, parent_id, is_transactional)
    VALUES (uuid_generate_v4(), v_org_id, '1200', 'Bank Accounts', 'asset', 'debit', v_acc_cash, false)
    RETURNING id INTO v_acc_bank;
    
    -- Receivables
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, parent_id)
    VALUES (uuid_generate_v4(), v_org_id, '1300', 'Accounts Receivable', 'asset', 'debit', v_acc_cash)
    RETURNING id INTO v_acc_receivables;
    
    -- LIABILITIES (2xxx)
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, is_transactional, is_system)
    VALUES (uuid_generate_v4(), v_org_id, '2000', 'Liabilities', 'liability', 'credit', false, true);
    
    -- Get liabilities parent
    SELECT id INTO v_acc_payables FROM accounts WHERE org_id = v_org_id AND code = '2000';
    
    INSERT INTO accounts (org_id, code, name, account_type, normal_balance, parent_id)
    VALUES
        (v_org_id, '2100', 'Accounts Payable', 'liability', 'credit', v_acc_payables),
        (v_org_id, '2200', 'Salaries Payable', 'liability', 'credit', v_acc_payables);
    
    -- EQUITY (3xxx)
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, is_transactional, is_system)
    VALUES (uuid_generate_v4(), v_org_id, '3000', 'Equity', 'equity', 'credit', false, true)
    RETURNING id INTO v_acc_owner_equity;
    
    INSERT INTO accounts (org_id, code, name, account_type, normal_balance, parent_id)
    VALUES
        (v_org_id, '3100', 'Owner Capital', 'equity', 'credit', v_acc_owner_equity),
        (v_org_id, '3200', 'Retained Earnings', 'equity', 'credit', v_acc_owner_equity);
    
    -- REVENUE (4xxx)
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, is_transactional, is_system)
    VALUES (uuid_generate_v4(), v_org_id, '4000', 'Revenue', 'revenue', 'credit', false, true)
    RETURNING id INTO v_acc_sales;
    
    -- Sales accounts per shop
    INSERT INTO accounts (org_id, code, name, account_type, normal_balance, parent_id, shop_id, is_system)
    VALUES
        (v_org_id, '4101', 'Sales - TRK', 'revenue', 'credit', v_acc_sales, v_shop_trk, true),
        (v_org_id, '4102', 'Sales - TRS', 'revenue', 'credit', v_acc_sales, v_shop_trs, true),
        (v_org_id, '4103', 'Sales - TFC', 'revenue', 'credit', v_acc_sales, v_shop_tfc, true),
        (v_org_id, '4104', 'Sales - TRJ', 'revenue', 'credit', v_acc_sales, v_shop_trj, true);
    
    -- EXPENSES (5xxx)
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, is_transactional, is_system)
    VALUES (uuid_generate_v4(), v_org_id, '5000', 'Expenses', 'expense', 'debit', false, true)
    RETURNING id INTO v_acc_raw_materials;
    
    INSERT INTO accounts (id, org_id, code, name, account_type, normal_balance, parent_id)
    VALUES
        (uuid_generate_v4(), v_org_id, '5100', 'Raw Materials', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5200', 'Packaging', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5300', 'Salaries & Wages', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5400', 'Rent', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5500', 'Utilities', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5600', 'Transport', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5700', 'Repairs & Maintenance', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5800', 'Wastage & Spoilage', 'expense', 'debit', v_acc_raw_materials),
        (uuid_generate_v4(), v_org_id, '5900', 'Miscellaneous', 'expense', 'debit', v_acc_raw_materials);
    
    -- Get Raw Materials parent for subcategories
    SELECT id INTO v_acc_raw_materials FROM accounts WHERE org_id = v_org_id AND code = '5100';
    
    INSERT INTO accounts (org_id, code, name, account_type, normal_balance, parent_id)
    VALUES
        (v_org_id, '5101', 'Vegetables', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5102', 'Chicken', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5103', 'Mutton', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5104', 'Dairy', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5105', 'Bakery Items', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5106', 'Spices & Masala', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5107', 'Oil & Ghee', 'expense', 'debit', v_acc_raw_materials),
        (v_org_id, '5108', 'Groceries', 'expense', 'debit', v_acc_raw_materials);
    
    -- =========================================================================
    -- 7. PAYMENT METHODS
    -- =========================================================================
    INSERT INTO payment_methods (org_id, name, code, method_type, display_order, for_sales, for_expenses)
    VALUES
        (v_org_id, 'Cash', 'CASH', 'cash', 1, true, true),
        (v_org_id, 'UPI', 'UPI', 'upi', 2, true, true),
        (v_org_id, 'Card', 'CARD', 'card', 3, true, false),
        (v_org_id, 'Swiggy', 'SWIGGY', 'aggregator', 4, true, false),
        (v_org_id, 'Zomato', 'ZOMATO', 'aggregator', 5, true, false),
        (v_org_id, 'Credit', 'CREDIT', 'credit', 6, false, true);
    
    -- Set commission for aggregators
    UPDATE payment_methods SET commission_percent = 20 
    WHERE org_id = v_org_id AND code IN ('SWIGGY', 'ZOMATO');
    
    -- =========================================================================
    -- 8. EXPENSE CATEGORIES
    -- =========================================================================
    INSERT INTO expense_categories (org_id, name, display_order)
    VALUES
        (v_org_id, 'Raw Materials', 1),
        (v_org_id, 'Packaging', 2),
        (v_org_id, 'Salaries', 3),
        (v_org_id, 'Rent', 4),
        (v_org_id, 'Utilities', 5),
        (v_org_id, 'Transport', 6),
        (v_org_id, 'Repairs', 7),
        (v_org_id, 'Miscellaneous', 8);
    
    -- Sub-categories for Raw Materials
    INSERT INTO expense_categories (org_id, name, parent_id, display_order)
    SELECT 
        v_org_id, 
        name, 
        (SELECT id FROM expense_categories WHERE org_id = v_org_id AND name = 'Raw Materials'),
        display_order
    FROM (VALUES
        ('Vegetables', 1),
        ('Chicken', 2),
        ('Mutton', 3),
        ('Dairy & Cheese', 4),
        ('Bakery Items', 5),
        ('Spices & Masala', 6),
        ('Oil & Ghee', 7),
        ('Groceries', 8)
    ) AS subcats(name, display_order);
    
    -- Link expense categories to accounts
    UPDATE expense_categories ec
    SET account_id = a.id
    FROM accounts a
    WHERE ec.org_id = v_org_id
      AND a.org_id = v_org_id
      AND ec.name = 'Vegetables' AND a.code = '5101';
    -- (Repeat for other categories as needed)
    
    -- =========================================================================
    -- 9. INVENTORY CATEGORIES
    -- =========================================================================
    INSERT INTO inventory_categories (org_id, name, display_order)
    VALUES
        (v_org_id, 'Raw Materials', 1),
        (v_org_id, 'Packaging', 2),
        (v_org_id, 'Consumables', 3),
        (v_org_id, 'Cleaning Supplies', 4);
    
    -- =========================================================================
    -- 10. LEAVE POLICY
    -- =========================================================================
    INSERT INTO leave_policies (org_id, name, paid_leaves_per_month, max_carryover, encash_unused, deduct_extra_from_salary, is_default)
    VALUES (v_org_id, 'Standard Policy', 2, 2, true, true, true);
    
    -- =========================================================================
    -- 11. DEFAULT SHIFT
    -- =========================================================================
    INSERT INTO shifts (org_id, name, start_time, end_time, break_minutes, standard_hours, late_grace_minutes, ot_threshold_minutes, ot_rate_multiplier, half_day_hours)
    VALUES (v_org_id, 'Full Day', '09:00', '21:00', 60, 11, 15, 30, 1.5, 5);
    
    -- =========================================================================
    -- 12. NOTIFICATION CONFIGS (Default alerts)
    -- =========================================================================
    INSERT INTO notification_configs (org_id, name, alert_type, conditions, is_active)
    VALUES
        (v_org_id, 'Low Stock Alert', 'low_stock', '{"threshold": "min_stock_level"}'::jsonb, true),
        (v_org_id, 'High Cash Variance', 'cash_variance', '{"threshold": 500}'::jsonb, true),
        (v_org_id, 'Unmapped Empcode', 'unmapped_empcode', '{}'::jsonb, true);
    
    RAISE NOTICE 'TRFC seed data created successfully!';
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'Owner Role ID: %', v_role_owner;
    
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run manually to verify)
-- ============================================================================

-- Check organization
-- SELECT * FROM organizations;

-- Check shops
-- SELECT id, name, code, city FROM shops ORDER BY display_order;

-- Check accounts hierarchy
-- SELECT 
--     REPEAT('  ', CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END) || code || ' - ' || name AS account,
--     account_type,
--     normal_balance
-- FROM accounts 
-- ORDER BY code;

-- Check payment methods
-- SELECT name, code, method_type, commission_percent FROM payment_methods ORDER BY display_order;

-- Check roles
-- SELECT name, shop_scope, permissions FROM roles ORDER BY is_system_role DESC, name;
