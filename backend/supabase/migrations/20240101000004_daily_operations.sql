-- ============================================================================
-- TRFC Schema v2.0 - Part 4: Daily Operations
-- ============================================================================
--
-- KEY FIXES (Normalizing JSONB):
-- 1. sales_entries is a proper table (was JSONB sales_entries array)
-- 2. expense_payments is a proper table (was JSONB payment_splits array)
-- 3. daily_inventory_entries is a proper table (was JSONB items array)
--
-- Why normalize?
-- - "Total UPI collections this week" is now a simple SQL query
-- - "Which vendor did we pay the most cash to?" is indexable
-- - "Chicken consumption trend" doesn't need JSON parsing
--
-- ============================================================================

-- ============================================================================
-- EXPENSES (Main expense records)
-- ============================================================================
-- 
-- Expense payment details are in expense_payments table (normalized).
--

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    shop_id UUID REFERENCES shops(id),  -- NULL for central expenses
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    vendor_id UUID REFERENCES vendors(id),
    
    description TEXT NOT NULL,
    quantity DECIMAL(12,3),
    rate DECIMAL(12,4),
    amount DECIMAL(15,2) NOT NULL,
    
    -- Payment status (derived from expense_payments, but cached for filtering)
    payment_status payment_status DEFAULT 'paid',
    
    -- Receipt image (Supabase Storage URL)
    receipt_url TEXT,
    
    -- Link to daily closing (if logged during wizard)
    daily_log_id UUID,  -- FK added below after daily_sales_logs
    
    -- Ledger batch
    ledger_batch_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_expenses_org ON expenses(org_id);
CREATE INDEX idx_expenses_shop ON expenses(shop_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_daily_log ON expenses(daily_log_id) WHERE daily_log_id IS NOT NULL;

CREATE TRIGGER trg_expenses_updated_at 
    BEFORE UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- EXPENSE PAYMENTS (Normalized from payment_splits JSONB)
-- ============================================================================
--
-- An expense can have multiple payments (split payment).
-- Example: ₹1000 expense paid ₹800 cash + ₹200 credit
--
-- Query benefit: "Total cash expenses this month" is now:
--   SELECT SUM(amount) FROM expense_payments WHERE method_type = 'cash' AND date >= ...
-- Instead of JSONB parsing.
--

CREATE TABLE expense_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    
    -- Quick filter fields (denormalized from payment_methods for query speed)
    method_type TEXT NOT NULL REFERENCES payment_method_types(code),
    is_cash BOOLEAN NOT NULL DEFAULT false,
    
    -- For bank payments, which account?
    bank_account_id UUID REFERENCES bank_accounts(id),
    
    -- If credit, when is it due?
    due_date DATE,
    
    payment_date DATE DEFAULT CURRENT_DATE,
    reference_number TEXT,  -- Check number, UPI ref, etc.
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_payments_expense ON expense_payments(expense_id);
CREATE INDEX idx_expense_payments_method ON expense_payments(payment_method_id);
CREATE INDEX idx_expense_payments_type ON expense_payments(method_type);
CREATE INDEX idx_expense_payments_cash ON expense_payments(is_cash) WHERE is_cash = true;
CREATE INDEX idx_expense_payments_date ON expense_payments(payment_date);

-- Trigger to update expense payment_status when payments change
CREATE OR REPLACE FUNCTION update_expense_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_expense_amount DECIMAL(15,2);
    v_paid_amount DECIMAL(15,2);
BEGIN
    SELECT amount INTO v_expense_amount 
    FROM expenses 
    WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);
    
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
    FROM expense_payments
    WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id);
    
    UPDATE expenses SET
        payment_status = CASE 
            WHEN v_paid_amount >= v_expense_amount THEN 'paid'
            WHEN v_paid_amount > 0 THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_expense_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON expense_payments
    FOR EACH ROW EXECUTE FUNCTION update_expense_payment_status();

-- Add FK from stock_logs to expenses
ALTER TABLE stock_logs 
    ADD CONSTRAINT fk_stock_logs_expense 
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;

-- ============================================================================
-- DAILY SALES LOGS (The Daily Closing Wizard Anchor)
-- ============================================================================
--
-- This is the main record for each shop's daily closing.
-- Child tables:
--   - sales_entries: Sales by payment method
--   - expenses (linked via daily_log_id): Petty expenses
--   - daily_inventory_entries: Nightly stock counts
--
-- Note: NO JSONB arrays! Everything is in proper child tables.
--

CREATE TABLE daily_sales_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    
    -- ===== STEP 1: SALES (totals derived from sales_entries) =====
    gross_sales DECIMAL(15,2) DEFAULT 0,
    total_returns DECIMAL(15,2) DEFAULT 0,
    net_sales DECIMAL(15,2) DEFAULT 0,
    
    -- ===== STEP 2: EXPENSES (totals derived from linked expenses) =====
    total_cash_expenses DECIMAL(15,2) DEFAULT 0,
    total_online_expenses DECIMAL(15,2) DEFAULT 0,
    
    -- ===== STEP 3: CASH RECONCILIATION =====
    opening_cash DECIMAL(15,2) DEFAULT 0,       -- Previous day's actual_closing
    cash_in DECIMAL(15,2) DEFAULT 0,            -- Manual additions
    cash_sales DECIMAL(15,2) DEFAULT 0,         -- Sum of cash payment methods
    cash_out DECIMAL(15,2) DEFAULT 0,           -- Withdrawals (bank deposit, drawings)
    
    -- Calculated: opening + cash_in + cash_sales - cash_expenses - cash_out
    expected_closing DECIMAL(15,2) DEFAULT 0,
    
    -- Manager enters this (physical count)
    actual_closing DECIMAL(15,2) DEFAULT 0,
    
    -- Difference (actual - expected)
    variance DECIMAL(15,2) DEFAULT 0,
    variance_reason TEXT,
    
    -- ===== STEP 4: INVENTORY (totals derived from daily_inventory_entries) =====
    total_items_counted INTEGER DEFAULT 0,
    
    -- ===== WORKFLOW =====
    status record_status DEFAULT 'draft',
    notes TEXT,
    
    -- Ledger batch (created when verified)
    ledger_batch_id UUID,
    
    -- Audit
    logged_by UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One log per shop per date
    UNIQUE(shop_id, log_date)
);

CREATE INDEX idx_dsl_org ON daily_sales_logs(org_id);
CREATE INDEX idx_dsl_shop ON daily_sales_logs(shop_id);
CREATE INDEX idx_dsl_date ON daily_sales_logs(log_date);
CREATE INDEX idx_dsl_status ON daily_sales_logs(status);
CREATE INDEX idx_dsl_shop_date ON daily_sales_logs(shop_id, log_date);

CREATE TRIGGER trg_daily_sales_logs_updated_at 
    BEFORE UPDATE ON daily_sales_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Now add FK from expenses to daily_sales_logs
ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_daily_log
    FOREIGN KEY (daily_log_id) REFERENCES daily_sales_logs(id) ON DELETE SET NULL;

-- Now add FK from wastage_logs to daily_sales_logs
ALTER TABLE wastage_logs
    ADD CONSTRAINT fk_wastage_daily_log
    FOREIGN KEY (daily_log_id) REFERENCES daily_sales_logs(id) ON DELETE SET NULL;

-- ============================================================================
-- SALES ENTRIES (Normalized from sales_entries JSONB array)
-- ============================================================================
--
-- One row per payment method per day per shop.
-- Example: TRK on Jan 23 has entries for Cash, UPI, Swiggy, Zomato
--
-- Query benefit: "Total Swiggy revenue this month across all shops"
--   SELECT SUM(net_amount) FROM sales_entries se 
--   JOIN payment_methods pm ON se.payment_method_id = pm.id
--   WHERE pm.code = 'swiggy' AND se.entry_date >= ...
--

CREATE TABLE sales_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id UUID NOT NULL REFERENCES daily_sales_logs(id) ON DELETE CASCADE,
    
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
    
    -- Quick filter fields (denormalized for query speed)
    method_type TEXT NOT NULL REFERENCES payment_method_types(code),
    is_cash BOOLEAN NOT NULL DEFAULT false,
    
    gross_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    returns_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- For aggregators: commission charged
    commission_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Derived: entry_date from parent (denormalized for direct queries)
    entry_date DATE NOT NULL,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One entry per payment method per log
    UNIQUE(daily_log_id, payment_method_id)
);

CREATE INDEX idx_sales_entries_log ON sales_entries(daily_log_id);
CREATE INDEX idx_sales_entries_method ON sales_entries(payment_method_id);
CREATE INDEX idx_sales_entries_type ON sales_entries(method_type);
CREATE INDEX idx_sales_entries_cash ON sales_entries(is_cash) WHERE is_cash = true;
CREATE INDEX idx_sales_entries_date ON sales_entries(entry_date);

-- Trigger to update parent totals
CREATE OR REPLACE FUNCTION update_daily_log_sales_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_log_id UUID;
BEGIN
    v_log_id := COALESCE(NEW.daily_log_id, OLD.daily_log_id);
    
    UPDATE daily_sales_logs SET
        gross_sales = COALESCE((
            SELECT SUM(gross_amount) FROM sales_entries WHERE daily_log_id = v_log_id
        ), 0),
        total_returns = COALESCE((
            SELECT SUM(returns_amount) FROM sales_entries WHERE daily_log_id = v_log_id
        ), 0),
        net_sales = COALESCE((
            SELECT SUM(net_amount) FROM sales_entries WHERE daily_log_id = v_log_id
        ), 0),
        cash_sales = COALESCE((
            SELECT SUM(net_amount) FROM sales_entries 
            WHERE daily_log_id = v_log_id AND is_cash = true
        ), 0),
        updated_at = NOW()
    WHERE id = v_log_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_daily_log_sales_totals
    AFTER INSERT OR UPDATE OR DELETE ON sales_entries
    FOR EACH ROW EXECUTE FUNCTION update_daily_log_sales_totals();

-- ============================================================================
-- DAILY INVENTORY ENTRIES (Normalized from items JSONB array)
-- ============================================================================
--
-- One row per item per daily log.
-- Implements the "rolling state" pattern:
--   Opening (Today) = Closing (Yesterday)
--   Consumed = Opening + Received - Closing
--
-- Query benefit: "Chicken consumption trend over 30 days"
--   SELECT entry_date, SUM(consumed) FROM daily_inventory_entries
--   WHERE item_id = '...' GROUP BY entry_date ORDER BY entry_date
--

CREATE TABLE daily_inventory_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id UUID NOT NULL REFERENCES daily_sales_logs(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    
    -- The rolling state values
    opening_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
    received DECIMAL(12,3) NOT NULL DEFAULT 0,      -- From transfers that day
    closing_stock DECIMAL(12,3) NOT NULL DEFAULT 0, -- Physical count
    
    -- Calculated: opening + received - closing
    consumed DECIMAL(12,3) NOT NULL DEFAULT 0,
    
    -- Denormalized for direct queries
    entry_date DATE NOT NULL,
    shop_id UUID NOT NULL REFERENCES shops(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One entry per item per log
    UNIQUE(daily_log_id, item_id)
);

CREATE INDEX idx_die_log ON daily_inventory_entries(daily_log_id);
CREATE INDEX idx_die_item ON daily_inventory_entries(item_id);
CREATE INDEX idx_die_date ON daily_inventory_entries(entry_date);
CREATE INDEX idx_die_shop ON daily_inventory_entries(shop_id);
CREATE INDEX idx_die_shop_date ON daily_inventory_entries(shop_id, entry_date);

-- Trigger to update parent count
CREATE OR REPLACE FUNCTION update_daily_log_inventory_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE daily_sales_logs SET
        total_items_counted = (
            SELECT COUNT(*) FROM daily_inventory_entries 
            WHERE daily_log_id = COALESCE(NEW.daily_log_id, OLD.daily_log_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.daily_log_id, OLD.daily_log_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_daily_log_inventory_count
    AFTER INSERT OR UPDATE OR DELETE ON daily_inventory_entries
    FOR EACH ROW EXECUTE FUNCTION update_daily_log_inventory_count();

-- Trigger to update expense totals on daily log
CREATE OR REPLACE FUNCTION update_daily_log_expense_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_log_id UUID;
BEGIN
    v_log_id := COALESCE(NEW.daily_log_id, OLD.daily_log_id);
    
    IF v_log_id IS NOT NULL THEN
        UPDATE daily_sales_logs SET
            total_cash_expenses = COALESCE((
                SELECT SUM(ep.amount) 
                FROM expenses e
                JOIN expense_payments ep ON ep.expense_id = e.id
                WHERE e.daily_log_id = v_log_id AND ep.is_cash = true
            ), 0),
            total_online_expenses = COALESCE((
                SELECT SUM(ep.amount) 
                FROM expenses e
                JOIN expense_payments ep ON ep.expense_id = e.id
                WHERE e.daily_log_id = v_log_id AND ep.is_cash = false
            ), 0),
            updated_at = NOW()
        WHERE id = v_log_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_daily_log_expense_totals
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_daily_log_expense_totals();

-- ============================================================================
-- CASH MOVEMENTS (Derived from Ledger via View)
-- ============================================================================
--
-- Instead of a separate cash_movements table, we derive from ledger.
-- This ensures single source of truth.
--
-- The view provides a convenient interface for UI.
--

CREATE OR REPLACE VIEW v_cash_movements AS
SELECT 
    le.id,
    le.org_id,
    le.entry_date AS movement_date,
    le.shop_id,
    s.name AS shop_name,
    CASE 
        WHEN le.debit > 0 THEN 'in'
        ELSE 'out'
    END AS direction,
    CASE 
        WHEN le.debit > 0 THEN le.debit
        ELSE le.credit
    END AS amount,
    le.description,
    le.source_type,
    le.source_id,
    le.created_at
FROM ledger_entries le
JOIN accounts a ON le.account_id = a.id
JOIN shops s ON le.shop_id = s.id
WHERE a.name LIKE 'Cash -%'
  AND a.account_type = 'asset'
ORDER BY le.entry_date DESC, le.created_at DESC;

-- ============================================================================
-- FUNCTION: Calculate Cash Reconciliation
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_cash_reconciliation()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate expected closing
    NEW.expected_closing := 
        COALESCE(NEW.opening_cash, 0) +
        COALESCE(NEW.cash_in, 0) +
        COALESCE(NEW.cash_sales, 0) -
        COALESCE(NEW.total_cash_expenses, 0) -
        COALESCE(NEW.cash_out, 0);
    
    -- Calculate variance
    NEW.variance := COALESCE(NEW.actual_closing, 0) - NEW.expected_closing;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_cash_reconciliation
    BEFORE INSERT OR UPDATE ON daily_sales_logs
    FOR EACH ROW EXECUTE FUNCTION calculate_cash_reconciliation();

-- ============================================================================
-- FUNCTION: Get Opening Cash for a Shop (Rolling State)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_opening_cash(
    p_shop_id UUID,
    p_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_opening DECIMAL(15,2);
BEGIN
    -- Find the most recent actual_closing before this date
    SELECT actual_closing INTO v_opening
    FROM daily_sales_logs
    WHERE shop_id = p_shop_id
      AND log_date < p_date
      AND status IN ('verified', 'locked')
    ORDER BY log_date DESC
    LIMIT 1;
    
    -- If no previous log, use the shop's initial cash (if set via opening balance)
    IF v_opening IS NULL THEN
        SELECT COALESCE(SUM(le.debit - le.credit), 0) INTO v_opening
        FROM ledger_entries le
        JOIN accounts a ON le.account_id = a.id
        WHERE a.shop_id = p_shop_id
          AND a.name LIKE 'Cash -%'
          AND a.account_type = 'asset'
          AND le.source_type = 'opening';
    END IF;
    
    RETURN COALESCE(v_opening, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: Get Opening Stock for Daily Inventory (Rolling State)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_opening_stock(
    p_shop_id UUID,
    p_item_id UUID,
    p_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_opening DECIMAL(12,3);
BEGIN
    -- Find previous day's closing stock
    SELECT die.closing_stock INTO v_opening
    FROM daily_inventory_entries die
    JOIN daily_sales_logs dsl ON die.daily_log_id = dsl.id
    WHERE dsl.shop_id = p_shop_id
      AND die.item_id = p_item_id
      AND dsl.log_date < p_date
      AND dsl.status IN ('verified', 'locked')
    ORDER BY dsl.log_date DESC
    LIMIT 1;
    
    -- If no previous entry, use current stock level
    IF v_opening IS NULL THEN
        SELECT quantity INTO v_opening
        FROM stock_levels
        WHERE shop_id = p_shop_id AND item_id = p_item_id;
    END IF;
    
    RETURN COALESCE(v_opening, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEW: Daily Operations Summary
-- ============================================================================

CREATE OR REPLACE VIEW v_daily_operations_summary AS
SELECT 
    dsl.id,
    dsl.org_id,
    dsl.shop_id,
    s.name AS shop_name,
    s.code AS shop_code,
    dsl.log_date,
    dsl.net_sales,
    dsl.total_cash_expenses + dsl.total_online_expenses AS total_expenses,
    dsl.net_sales - (dsl.total_cash_expenses + dsl.total_online_expenses) AS gross_profit,
    dsl.variance,
    dsl.status,
    dsl.total_items_counted,
    p.full_name AS logged_by_name,
    dsl.created_at,
    dsl.verified_at
FROM daily_sales_logs dsl
JOIN shops s ON dsl.shop_id = s.id
LEFT JOIN profiles p ON dsl.logged_by = p.id;

COMMENT ON TABLE sales_entries IS 
'Normalized from JSONB. One row per payment method per daily log. Enables: "Total Swiggy revenue this month"';

COMMENT ON TABLE expense_payments IS 
'Normalized from JSONB. One row per payment split. Enables: "Total cash paid to vendors this month"';

COMMENT ON TABLE daily_inventory_entries IS 
'Normalized from JSONB. Rolling state: Opening = Yesterday Closing. Enables: "Chicken consumption trend"';
