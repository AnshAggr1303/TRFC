-- ============================================================================
-- TRFC Multi-Shop Business Management System
-- PostgreSQL Schema v2.0 (Revised after code review)
-- ============================================================================
-- 
-- KEY DESIGN FIXES:
-- 1. JSONB normalized to child tables for queryable data
-- 2. Strict ledger balance enforcement at database level
-- 3. Removed denormalized stock fields (use views/functions)
-- 4. Enums only for workflow states, lookup tables for event types
-- 5. Removed non-essential tables for v1 (investments, utilities, recurring)
-- 6. Single source of truth for cash (ledger, with view for convenience)
--
-- SCHEMA ORGANIZATION:
-- 001_foundation.sql      - Extensions, enums, lookup tables, core config
-- 002_financial.sql       - Chart of accounts, ledger with strict enforcement
-- 003_inventory.sql       - Items, stock levels, movements
-- 004_daily_operations.sql - Daily sales logs, normalized child tables
-- 005_hr_payroll.sql      - Employees, attendance, payroll
-- 006_system.sql          - Activity logs, notifications
-- 007_functions.sql       - Business logic functions
-- 008_rls.sql             - Row-level security policies
-- 009_seed.sql            - Initial data
--
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Fuzzy text search

-- ============================================================================
-- ENUMS (Only for TRUE workflow states with fixed transitions)
-- ============================================================================

-- These represent state machines where values are truly fixed:

-- Employment type: only 2 options, won't change
CREATE TYPE employment_type AS ENUM ('monthly', 'daily');

-- Accounting: fixed by standards (GAAP/IFRS)
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- Document workflow: universal state machine for all records
CREATE TYPE record_status AS ENUM ('draft', 'submitted', 'verified', 'locked');

-- Payroll workflow
CREATE TYPE payroll_status AS ENUM ('draft', 'finalized', 'paid');

-- Payment status
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'pending');

-- Notification severity (fixed 3-level scale)
CREATE TYPE notification_severity AS ENUM ('info', 'warning', 'critical');

-- ============================================================================
-- LOOKUP TABLES (For extensible event types)
-- ============================================================================
-- These will inevitably need new values (biometric_error, inventory_damage, etc.)
-- Using lookup tables means no migrations needed to add values.

-- Stock movement types (will expand: damage, sample, return, etc.)
CREATE TABLE stock_movement_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    direction INTEGER NOT NULL CHECK (direction IN (-1, 0, 1)), -- -1=out, 0=neutral, 1=in
    description TEXT,
    requires_cost BOOLEAN DEFAULT false,    -- Must have cost_per_unit?
    requires_reference BOOLEAN DEFAULT false, -- Must have reference document?
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO stock_movement_types (code, name, direction, description, requires_cost, display_order) VALUES
('opening', 'Opening Balance', 1, 'Initial stock entry', true, 1),
('purchase', 'Purchase', 1, 'Bought from vendor', true, 10),
('transfer_in', 'Transfer In', 1, 'Received from another location', false, 20),
('transfer_out', 'Transfer Out', -1, 'Sent to another location', false, 21),
('consumption', 'Consumption', -1, 'Used in daily operations', false, 30),
('wastage', 'Wastage', -1, 'Spoiled, expired, damaged', false, 40),
('adjustment_add', 'Adjustment (+)', 1, 'Manual increase', false, 50),
('adjustment_sub', 'Adjustment (-)', -1, 'Manual decrease', false, 51),
('return_vendor', 'Return to Vendor', -1, 'Returned defective goods', false, 60);

-- Attendance status types (will expand: overtime, comp_off, half_day_first, etc.)
CREATE TABLE attendance_status_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    counts_as_present DECIMAL(3,2) NOT NULL DEFAULT 0, -- 1.0=full, 0.5=half, 0=absent
    is_paid BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO attendance_status_types (code, name, counts_as_present, is_paid, description) VALUES
('present', 'Present', 1.0, true, 'Worked full day'),
('absent', 'Absent', 0.0, false, 'Did not attend'),
('late', 'Late', 1.0, true, 'Arrived late, worked full day'),
('half_day', 'Half Day', 0.5, true, 'Worked partial day'),
('leave_paid', 'Paid Leave', 0.0, true, 'Approved paid leave'),
('leave_unpaid', 'Unpaid Leave', 0.0, false, 'Approved unpaid leave'),
('week_off', 'Week Off', 0.0, false, 'Scheduled day off'),
('holiday', 'Holiday', 0.0, true, 'Public holiday');

-- Activity action types (will expand: approve, reject, print, email, etc.)
CREATE TABLE activity_action_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'crud', 'workflow', 'auth', 'data', 'system'
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    description TEXT
);

INSERT INTO activity_action_types (code, name, category, severity) VALUES
('create', 'Created', 'crud', 'info'),
('update', 'Updated', 'crud', 'info'),
('delete', 'Deleted', 'crud', 'warning'),
('submit', 'Submitted', 'workflow', 'info'),
('verify', 'Verified', 'workflow', 'info'),
('lock', 'Locked', 'workflow', 'info'),
('unlock', 'Unlocked', 'workflow', 'warning'),
('approve', 'Approved', 'workflow', 'info'),
('reject', 'Rejected', 'workflow', 'warning'),
('login', 'Logged In', 'auth', 'info'),
('logout', 'Logged Out', 'auth', 'info'),
('sync', 'Synced', 'system', 'info'),
('export', 'Exported', 'data', 'info'),
('import', 'Imported', 'data', 'warning');

-- Payment method types (will expand: specific UPI apps, wallets, etc.)
CREATE TABLE payment_method_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_cash BOOLEAN NOT NULL DEFAULT false, -- Affects physical cash drawer?
    is_online BOOLEAN NOT NULL DEFAULT false, -- Goes to bank account?
    commission_default DECIMAL(5,2) DEFAULT 0, -- Default commission %
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO payment_method_types (code, name, is_cash, is_online, commission_default, description) VALUES
('cash', 'Cash', true, false, 0, 'Physical currency'),
('upi', 'UPI', false, true, 0, 'UPI payment'),
('card', 'Card', false, true, 1.5, 'Credit/Debit card'),
('swiggy', 'Swiggy', false, false, 20, 'Swiggy orders'),
('zomato', 'Zomato', false, false, 20, 'Zomato orders'),
('credit', 'Credit', false, false, 0, 'Payment pending');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get Indian financial year start (April 1)
CREATE OR REPLACE FUNCTION get_fy_start(for_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN CASE 
        WHEN EXTRACT(MONTH FROM for_date) >= 4 
        THEN DATE_TRUNC('year', for_date) + INTERVAL '3 months'
        ELSE DATE_TRUNC('year', for_date) - INTERVAL '9 months'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get FY string (e.g., "2025-26")
CREATE OR REPLACE FUNCTION get_fy_string(for_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    fy_start DATE := get_fy_start(for_date);
BEGIN
    RETURN EXTRACT(YEAR FROM fy_start)::TEXT || '-' || 
           SUBSTRING((EXTRACT(YEAR FROM fy_start) + 1)::TEXT, 3, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- CORE CONFIGURATION TABLES
-- ============================================================================

-- Organization (top-level tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    logo_url TEXT,
    
    -- Settings as JSONB (truly metadata, rarely queried as fields)
    settings JSONB DEFAULT '{
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "cash_variance_threshold": 500,
        "date_format": "DD/MM/YYYY"
    }'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Shops (outlets)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    
    opening_time TIME DEFAULT '09:00',
    closing_time TIME DEFAULT '22:00',
    weekly_off INTEGER[] DEFAULT ARRAY[0], -- 0=Sunday
    
    phone TEXT,
    email TEXT,
    pos_system TEXT,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, code)
);

CREATE INDEX idx_shops_org ON shops(org_id);
CREATE INDEX idx_shops_active ON shops(org_id) WHERE is_active = true;

CREATE TRIGGER trg_shops_updated_at 
    BEFORE UPDATE ON shops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storerooms (central inventory)
CREATE TABLE storerooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    city TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storerooms_org ON storerooms(org_id);

CREATE TRIGGER trg_storerooms_updated_at 
    BEFORE UPDATE ON storerooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storeroom-Shop mapping
CREATE TABLE storeroom_shop_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storeroom_id UUID NOT NULL REFERENCES storerooms(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(storeroom_id, shop_id)
);

CREATE INDEX idx_ssm_storeroom ON storeroom_shop_mappings(storeroom_id);
CREATE INDEX idx_ssm_shop ON storeroom_shop_mappings(shop_id);

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Permissions as JSONB array (fine here - checked per request, not aggregated)
    -- Format: ["sales.view", "sales.create", "expenses.*", "*"]
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- 'all' = can access all shops, 'assigned' = only assigned shops
    shop_scope TEXT NOT NULL DEFAULT 'assigned' CHECK (shop_scope IN ('all', 'assigned')),
    
    is_system_role BOOLEAN DEFAULT false, -- Cannot delete Owner role
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, name)
);

CREATE INDEX idx_roles_org ON roles(org_id);

CREATE TRIGGER trg_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    full_name TEXT NOT NULL,
    display_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    employee_id UUID, -- FK added after employees table
    
    -- Preferences (true metadata, JSONB fine)
    preferences JSONB DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_profiles_role ON profiles(role_id);

CREATE TRIGGER trg_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- User-Shop assignments
CREATE TABLE user_shop_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_usa_user ON user_shop_assignments(user_id);
CREATE INDEX idx_usa_shop ON user_shop_assignments(shop_id);

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment after Supabase Auth setup:
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON TABLE organizations IS 'Multi-tenant root. Currently only TRFC.';
COMMENT ON TABLE shops IS 'Individual outlets: TRK, TRS, TFC, TRJ';
COMMENT ON TABLE storerooms IS 'Central inventory locations that serve shops';
COMMENT ON TABLE roles IS 'Permission groups. Permissions stored as JSONB array of "module.action" strings.';
COMMENT ON TABLE profiles IS 'User accounts extending Supabase auth. Links to roles and optionally employees.';
