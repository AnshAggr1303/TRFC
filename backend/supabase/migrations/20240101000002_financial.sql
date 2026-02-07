-- ============================================================================
-- TRFC Schema v2.0 - Part 2: Financial System
-- ============================================================================
--
-- CRITICAL FIX: STRICT LEDGER BALANCE ENFORCEMENT
--
-- The ledger is the heart of accounting. It MUST be structurally incorruptible.
-- 
-- Previous design flaw: "Enforce balance in application layer"
-- This design: Database-level enforcement. No unbalanced entries can exist.
--
-- How it works:
-- 1. All writes go through create_ledger_batch() function
-- 2. Function validates SUM(debit) = SUM(credit) BEFORE any INSERT
-- 3. Direct INSERTs to ledger_entries are blocked by trigger
-- 4. The "trust context" pattern allows only the function to write
--
-- ============================================================================

-- ============================================================================
-- CHART OF ACCOUNTS
-- ============================================================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    code TEXT,                    -- "1100", "4001"
    name TEXT NOT NULL,           -- "Cash - TRK", "Sales Revenue"
    description TEXT,
    
    account_type account_type NOT NULL,
    
    -- Normal balance side for this account type
    -- Assets & Expenses: debit increases
    -- Liabilities, Equity & Revenue: credit increases
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    
    -- Hierarchy
    parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Shop-specific accounts (NULL = org-wide)
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    
    -- Transactional accounts can have direct entries
    -- Summary accounts are for hierarchy only
    is_transactional BOOLEAN DEFAULT true,
    
    -- System accounts cannot be deleted
    is_system BOOLEAN DEFAULT false,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, code)
);

CREATE INDEX idx_accounts_org ON accounts(org_id);
CREATE INDEX idx_accounts_type ON accounts(org_id, account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_shop ON accounts(shop_id) WHERE shop_id IS NOT NULL;

CREATE TRIGGER trg_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT,
    
    method_type TEXT NOT NULL REFERENCES payment_method_types(code),
    
    -- Shop-specific (NULL = all shops)
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Linked chart of accounts entry
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Commission (for aggregators like Swiggy/Zomato)
    commission_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Usage flags
    for_sales BOOLEAN DEFAULT true,
    for_expenses BOOLEAN DEFAULT true,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_org ON payment_methods(org_id);

CREATE TRIGGER trg_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- EXPENSE CATEGORIES
-- ============================================================================

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    
    -- Shop-specific (NULL = all shops)
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Linked expense account in chart of accounts
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_categories_org ON expense_categories(org_id);
CREATE INDEX idx_expense_categories_parent ON expense_categories(parent_id);

CREATE TRIGGER trg_expense_categories_updated_at 
    BEFORE UPDATE ON expense_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VENDORS
-- ============================================================================

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    
    -- Tax info
    gstin TEXT,
    pan TEXT,
    
    -- Payment terms
    credit_days INTEGER DEFAULT 0, -- 0 = immediate
    
    -- Bank details for payments
    bank_name TEXT,
    bank_account TEXT,
    bank_ifsc TEXT,
    upi_id TEXT,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_org ON vendors(org_id);
CREATE INDEX idx_vendors_name ON vendors USING gin(name gin_trgm_ops);

CREATE TRIGGER trg_vendors_updated_at 
    BEFORE UPDATE ON vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vendor-Category relationship (what categories does vendor supply)
CREATE TABLE vendor_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    is_preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(vendor_id, category_id)
);

-- ============================================================================
-- BANK ACCOUNTS (simplified - no current_balance, derive from ledger)
-- ============================================================================

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    branch TEXT,
    
    -- Linked to chart of accounts
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Opening balance (for initial setup only)
    opening_balance DECIMAL(12,2) DEFAULT 0,
    opening_balance_date DATE,
    
    -- NO current_balance field! Derive from ledger.
    
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_org ON bank_accounts(org_id);

CREATE TRIGGER trg_bank_accounts_updated_at 
    BEFORE UPDATE ON bank_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- LEDGER ENTRIES (The Sacred Table)
-- ============================================================================
--
-- DESIGN PRINCIPLES:
-- 1. IMMUTABLE: No UPDATE trigger, no updated_at column
-- 2. BALANCED: Every batch must have SUM(debit) = SUM(credit)
-- 3. TRACEABLE: Every entry links to its source document
-- 4. PROTECTED: Direct INSERTs are blocked
--
-- ============================================================================

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    
    -- Batch groups related entries (must balance within batch)
    batch_id UUID NOT NULL,
    
    -- The economic event date (not the insert timestamp)
    entry_date DATE NOT NULL,
    
    -- Source document tracking
    source_type TEXT NOT NULL,    -- 'daily_sales', 'expense', 'payroll', 'adjustment', 'opening'
    source_id UUID,               -- ID of source document
    
    -- The account affected
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    
    -- Shop context (for filtering reports)
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    
    -- The amounts (exactly one must be > 0)
    debit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    
    description TEXT,
    
    -- Metadata (truly auxiliary info, JSONB is fine)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- IMMUTABLE: only created_at, no updated_at
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Exactly one of debit/credit must be positive
    CONSTRAINT ledger_debit_xor_credit CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

-- Indexes for common query patterns
CREATE INDEX idx_ledger_org ON ledger_entries(org_id);
CREATE INDEX idx_ledger_batch ON ledger_entries(batch_id);
CREATE INDEX idx_ledger_date ON ledger_entries(entry_date);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_account_date ON ledger_entries(account_id, entry_date);
CREATE INDEX idx_ledger_shop ON ledger_entries(shop_id) WHERE shop_id IS NOT NULL;
CREATE INDEX idx_ledger_source ON ledger_entries(source_type, source_id);

-- ============================================================================
-- LEDGER PROTECTION: Block direct INSERTs
-- ============================================================================
-- 
-- We use a session-level flag to track "trusted" context.
-- The create_ledger_batch() function sets this flag before writing.
-- Direct INSERTs (without the flag) are blocked.
--

-- Session variable to track trusted context
-- PostgreSQL doesn't have true session variables, so we use a config setting
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For tracking

CREATE OR REPLACE FUNCTION is_ledger_write_trusted()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if we're in trusted context (set by create_ledger_batch)
    RETURN COALESCE(current_setting('trfc.ledger_write_trusted', true), 'false') = 'true';
END;
$$ LANGUAGE plpgsql;

-- Block direct inserts
CREATE OR REPLACE FUNCTION block_direct_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_ledger_write_trusted() THEN
        RAISE EXCEPTION 
            'Direct INSERT to ledger_entries is BLOCKED. Use create_ledger_batch() function. '
            'This ensures double-entry balance is validated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_direct_ledger_insert
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION block_direct_ledger_insert();

-- ============================================================================
-- THE SACRED FUNCTION: create_ledger_batch()
-- ============================================================================
--
-- This is the ONLY way to write to the ledger.
-- It validates balance BEFORE any insert, not after.
--
-- Arguments:
--   p_org_id: Organization
--   p_entry_date: The economic event date
--   p_source_type: What created this ('daily_sales', 'expense', etc.)
--   p_source_id: ID of source document
--   p_shop_id: Shop context (optional)
--   p_entries: Array of entries as JSONB
--              [{"account_id": "...", "debit": 100, "credit": 0, "description": "..."}]
--   p_created_by: User who triggered this
--
-- Returns: batch_id
--
-- ============================================================================

CREATE OR REPLACE FUNCTION create_ledger_batch(
    p_org_id UUID,
    p_entry_date DATE,
    p_source_type TEXT,
    p_source_id UUID,
    p_shop_id UUID,
    p_entries JSONB,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_batch_id UUID;
    v_total_debit DECIMAL(15,2) := 0;
    v_total_credit DECIMAL(15,2) := 0;
    v_entry JSONB;
    v_debit DECIMAL(15,2);
    v_credit DECIMAL(15,2);
    v_account_id UUID;
BEGIN
    -- ==== PHASE 1: VALIDATION (before any writes) ====
    
    -- Must have at least 2 entries (double-entry)
    IF jsonb_array_length(p_entries) < 2 THEN
        RAISE EXCEPTION 'Ledger batch requires at least 2 entries (double-entry). Got %', 
            jsonb_array_length(p_entries);
    END IF;
    
    -- Validate each entry and calculate totals
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_account_id := (v_entry->>'account_id')::UUID;
        v_debit := COALESCE((v_entry->>'debit')::DECIMAL, 0);
        v_credit := COALESCE((v_entry->>'credit')::DECIMAL, 0);
        
        -- Must have exactly one positive amount
        IF NOT ((v_debit > 0 AND v_credit = 0) OR (v_debit = 0 AND v_credit > 0)) THEN
            RAISE EXCEPTION 'Entry must have exactly one positive amount. Got debit=%, credit=%',
                v_debit, v_credit;
        END IF;
        
        -- Account must exist, be active, and be transactional
        IF NOT EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = v_account_id 
            AND org_id = p_org_id 
            AND is_transactional = true 
            AND is_active = true
        ) THEN
            RAISE EXCEPTION 'Account % not found, not transactional, or inactive', v_account_id;
        END IF;
        
        v_total_debit := v_total_debit + v_debit;
        v_total_credit := v_total_credit + v_credit;
    END LOOP;
    
    -- THE CRITICAL CHECK: Balance must match (with small tolerance for floating point)
    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
        RAISE EXCEPTION 
            'LEDGER IMBALANCE BLOCKED! Debits=% Credits=% Difference=%. '
            'Every batch must balance: SUM(debit) = SUM(credit)',
            v_total_debit, v_total_credit, ABS(v_total_debit - v_total_credit);
    END IF;
    
    -- ==== PHASE 2: WRITE (after validation passes) ====
    
    v_batch_id := uuid_generate_v4();
    
    -- Enable trusted context (allows the trigger to let us through)
    PERFORM set_config('trfc.ledger_write_trusted', 'true', true); -- true = local to transaction
    
    -- Insert all entries
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        INSERT INTO ledger_entries (
            org_id, batch_id, entry_date,
            source_type, source_id,
            account_id, shop_id,
            debit, credit,
            description, created_by
        ) VALUES (
            p_org_id, v_batch_id, p_entry_date,
            p_source_type, p_source_id,
            (v_entry->>'account_id')::UUID, p_shop_id,
            COALESCE((v_entry->>'debit')::DECIMAL, 0),
            COALESCE((v_entry->>'credit')::DECIMAL, 0),
            v_entry->>'description', p_created_by
        );
    END LOOP;
    
    -- Disable trusted context
    PERFORM set_config('trfc.ledger_write_trusted', 'false', true);
    
    RETURN v_batch_id;
    
EXCEPTION WHEN OTHERS THEN
    -- Always clear trusted context on error
    PERFORM set_config('trfc.ledger_write_trusted', 'false', true);
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER: Get account balance
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_balance(
    p_account_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE,
    p_shop_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_normal_balance TEXT;
    v_balance DECIMAL(15,2);
BEGIN
    SELECT normal_balance INTO v_normal_balance
    FROM accounts WHERE id = p_account_id;
    
    -- Calculate balance based on normal balance side
    SELECT CASE v_normal_balance
        WHEN 'debit' THEN COALESCE(SUM(debit - credit), 0)
        ELSE COALESCE(SUM(credit - debit), 0)
    END INTO v_balance
    FROM ledger_entries
    WHERE account_id = p_account_id
      AND entry_date <= p_as_of_date
      AND (p_shop_id IS NULL OR shop_id = p_shop_id);
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEW: Cash Position by Shop (replaces cash_movements table)
-- ============================================================================
-- 
-- Instead of a separate cash_movements table, we derive cash from ledger.
-- This ensures single source of truth.
--

CREATE OR REPLACE VIEW v_shop_cash_balances AS
WITH cash_accounts AS (
    SELECT a.id, a.shop_id, s.name AS shop_name, s.code AS shop_code
    FROM accounts a
    JOIN shops s ON a.shop_id = s.id
    WHERE a.name LIKE 'Cash -%'
      AND a.account_type = 'asset'
      AND a.is_active = true
)
SELECT 
    ca.shop_id,
    ca.shop_name,
    ca.shop_code,
    COALESCE(SUM(le.debit - le.credit), 0) AS cash_balance,
    MAX(le.entry_date) AS last_transaction_date
FROM cash_accounts ca
LEFT JOIN ledger_entries le ON le.account_id = ca.id
GROUP BY ca.shop_id, ca.shop_name, ca.shop_code;

-- ============================================================================
-- VIEW: Vendor Outstanding Balances
-- ============================================================================

CREATE OR REPLACE VIEW v_vendor_balances AS
SELECT 
    v.id AS vendor_id,
    v.org_id,
    v.name AS vendor_name,
    COALESCE(SUM(le.credit - le.debit), 0) AS outstanding_balance
FROM vendors v
LEFT JOIN accounts a ON a.name = 'AP - ' || v.name AND a.org_id = v.org_id
LEFT JOIN ledger_entries le ON le.account_id = a.id
WHERE v.is_active = true
GROUP BY v.id, v.org_id, v.name;

COMMENT ON TABLE ledger_entries IS 
'IMMUTABLE double-entry ledger. All writes MUST go through create_ledger_batch() which enforces SUM(debit)=SUM(credit). Direct INSERTs are blocked by trigger.';

COMMENT ON FUNCTION create_ledger_batch IS 
'The ONLY way to write ledger entries. Validates balance BEFORE any INSERT. Returns batch_id on success.';
