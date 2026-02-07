-- ============================================================================
-- TRFC Schema v2.0 - Part 3: Inventory System
-- ============================================================================
--
-- KEY FIXES:
-- 1. NO central_stock on inventory_items (was a consistency risk)
--    - Use get_stock_at_location() function or v_stock_levels view
-- 2. stock_log_items is a proper table (was JSONB in stock_logs.items)
-- 3. All stock changes go through record_stock_movement() for atomicity
--
-- ============================================================================

-- ============================================================================
-- UNITS OF MEASURE
-- ============================================================================

CREATE TABLE units_of_measure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,            -- "Kilogram"
    abbreviation TEXT NOT NULL,    -- "kg"
    
    -- Conversion support
    base_unit_id UUID REFERENCES units_of_measure(id),
    conversion_factor DECIMAL(15,6) DEFAULT 1.0,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, abbreviation)
);

CREATE INDEX idx_uom_org ON units_of_measure(org_id);

-- ============================================================================
-- INVENTORY CATEGORIES (hierarchical)
-- ============================================================================

CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    parent_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
    
    -- Link to expense account for cost tracking
    expense_account_id UUID REFERENCES accounts(id),
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inv_cat_org ON inventory_categories(org_id);
CREATE INDEX idx_inv_cat_parent ON inventory_categories(parent_id);

CREATE TRIGGER trg_inventory_categories_updated_at 
    BEFORE UPDATE ON inventory_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- INVENTORY ITEMS (Master List)
-- ============================================================================
-- 
-- IMPORTANT: No "central_stock" field!
-- Stock quantities are tracked in stock_levels table and derived via views.
-- This prevents the consistency risk of having stock in two places.
--

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    code TEXT,                     -- SKU
    description TEXT,
    
    category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
    unit_id UUID NOT NULL REFERENCES units_of_measure(id),
    
    -- Tracking behavior:
    -- 'daily' = Must count every night (perishables, high-turnover)
    -- 'weekly'/'monthly' = Bulk items counted periodically
    -- 'on_demand' = Only count when requested
    inspection_frequency TEXT NOT NULL DEFAULT 'daily' 
        CHECK (inspection_frequency IN ('daily', 'weekly', 'monthly', 'on_demand')),
    
    -- Expiry tracking
    track_expiry BOOLEAN DEFAULT false,
    default_shelf_life_days INTEGER,
    
    -- Stock alerts (applied in v_low_stock_items view)
    min_stock_level DECIMAL(12,3) DEFAULT 0,
    reorder_level DECIMAL(12,3),
    reorder_quantity DECIMAL(12,3),
    
    -- Standard cost (for estimates when actual unavailable)
    standard_cost DECIMAL(12,2),
    
    -- Which shops can use this item (NULL = all)
    available_at_shop_ids UUID[],
    
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, name)
);

CREATE INDEX idx_inv_items_org ON inventory_items(org_id);
CREATE INDEX idx_inv_items_category ON inventory_items(category_id);
CREATE INDEX idx_inv_items_inspection ON inventory_items(org_id, inspection_frequency);
CREATE INDEX idx_inv_items_name ON inventory_items USING gin(name gin_trgm_ops);

CREATE TRIGGER trg_inventory_items_updated_at 
    BEFORE UPDATE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STOCK LEVELS (Current Quantities - Single Source of Truth)
-- ============================================================================
--
-- One row per item per location (shop or storeroom).
-- Updated ONLY via record_stock_movement() to ensure consistency with log.
--

CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Location: exactly one must be set
    storeroom_id UUID REFERENCES storerooms(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Current quantity
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    
    -- Weighted average cost per unit
    avg_cost DECIMAL(12,4) DEFAULT 0,
    
    -- Last activity (denormalized for quick access)
    last_movement_at TIMESTAMPTZ,
    last_movement_type TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT sl_one_location CHECK (
        (storeroom_id IS NOT NULL AND shop_id IS NULL) OR
        (storeroom_id IS NULL AND shop_id IS NOT NULL)
    ),
    CONSTRAINT sl_non_negative CHECK (quantity >= 0),
    UNIQUE(item_id, storeroom_id, shop_id)
);

CREATE INDEX idx_stock_levels_org ON stock_levels(org_id);
CREATE INDEX idx_stock_levels_item ON stock_levels(item_id);
CREATE INDEX idx_stock_levels_storeroom ON stock_levels(storeroom_id) WHERE storeroom_id IS NOT NULL;
CREATE INDEX idx_stock_levels_shop ON stock_levels(shop_id) WHERE shop_id IS NOT NULL;

CREATE TRIGGER trg_stock_levels_updated_at 
    BEFORE UPDATE ON stock_levels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STOCK MOVEMENTS (Immutable Audit Log)
-- ============================================================================
--
-- Every change to stock_levels creates a corresponding movement record.
-- This is the audit trail - never update, only append.
--

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    
    -- Location
    storeroom_id UUID REFERENCES storerooms(id),
    shop_id UUID REFERENCES shops(id),
    
    -- Movement details
    movement_type TEXT NOT NULL REFERENCES stock_movement_types(code),
    movement_date DATE NOT NULL,
    
    -- Quantity change (positive = in, negative = out)
    quantity DECIMAL(12,3) NOT NULL,
    
    -- Cost at time of movement
    cost_per_unit DECIMAL(12,4),
    total_cost DECIMAL(15,2),
    
    -- Balance after this movement (for audit trail)
    balance_after DECIMAL(12,3) NOT NULL,
    
    -- Source reference
    source_type TEXT,              -- 'stock_log', 'daily_closing', 'transfer', 'adjustment'
    source_id UUID,
    
    -- Batch/expiry tracking
    batch_number TEXT,
    expiry_date DATE,
    
    notes TEXT,
    
    -- Immutable: only created_at
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    CONSTRAINT sm_one_location CHECK (
        (storeroom_id IS NOT NULL AND shop_id IS NULL) OR
        (storeroom_id IS NULL AND shop_id IS NOT NULL)
    )
);

CREATE INDEX idx_stock_movements_org ON stock_movements(org_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_storeroom ON stock_movements(storeroom_id) WHERE storeroom_id IS NOT NULL;
CREATE INDEX idx_stock_movements_shop ON stock_movements(shop_id) WHERE shop_id IS NOT NULL;
CREATE INDEX idx_stock_movements_source ON stock_movements(source_type, source_id);

-- ============================================================================
-- STOCK LOGS (Purchase/Transfer Document Headers)
-- ============================================================================
--
-- The header for a stock transaction (purchase, transfer, etc.)
-- Line items are in stock_log_items (normalized, NOT JSONB)
--

CREATE TABLE stock_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Document info
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    log_number TEXT,               -- Auto-generated: "PO-2026-0001"
    log_type TEXT NOT NULL CHECK (log_type IN ('purchase', 'transfer', 'adjustment', 'return')),
    reference_number TEXT,         -- Vendor invoice number
    
    -- Destination (for purchases and transfers)
    to_storeroom_id UUID REFERENCES storerooms(id),
    to_shop_id UUID REFERENCES shops(id),
    
    -- Source (for transfers)
    from_storeroom_id UUID REFERENCES storerooms(id),
    from_shop_id UUID REFERENCES shops(id),
    
    -- Vendor (for purchases)
    vendor_id UUID REFERENCES vendors(id),
    
    -- Totals (denormalized from items for quick display)
    -- These are updated by trigger when items change
    total_items INTEGER DEFAULT 0,
    total_quantity DECIMAL(12,3) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    notes TEXT,
    status record_status DEFAULT 'submitted',
    
    -- Link to expense (if purchase was also logged as expense)
    expense_id UUID,  -- FK added in daily_operations.sql
    
    -- Ledger batch (if posted to ledger)
    ledger_batch_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_stock_logs_org ON stock_logs(org_id);
CREATE INDEX idx_stock_logs_date ON stock_logs(log_date);
CREATE INDEX idx_stock_logs_type ON stock_logs(log_type);
CREATE INDEX idx_stock_logs_vendor ON stock_logs(vendor_id);

CREATE TRIGGER trg_stock_logs_updated_at 
    BEFORE UPDATE ON stock_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STOCK LOG ITEMS (Normalized child table - was JSONB!)
-- ============================================================================
--
-- This is a proper table, NOT JSONB.
-- Benefits:
-- - Queryable: "Total chicken purchased this month"
-- - Indexable: Fast lookups by item
-- - Constrainable: Foreign keys, check constraints
--

CREATE TABLE stock_log_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_log_id UUID NOT NULL REFERENCES stock_logs(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    rate DECIMAL(12,4) NOT NULL DEFAULT 0,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Batch/expiry (optional)
    batch_number TEXT,
    manufacturing_date DATE,
    expiry_date DATE,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sli_stock_log ON stock_log_items(stock_log_id);
CREATE INDEX idx_sli_item ON stock_log_items(item_id);

-- Trigger to update parent totals when items change
CREATE OR REPLACE FUNCTION update_stock_log_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stock_logs SET
        total_items = (
            SELECT COUNT(*) FROM stock_log_items 
            WHERE stock_log_id = COALESCE(NEW.stock_log_id, OLD.stock_log_id)
        ),
        total_quantity = (
            SELECT COALESCE(SUM(quantity), 0) FROM stock_log_items 
            WHERE stock_log_id = COALESCE(NEW.stock_log_id, OLD.stock_log_id)
        ),
        total_amount = (
            SELECT COALESCE(SUM(amount), 0) FROM stock_log_items 
            WHERE stock_log_id = COALESCE(NEW.stock_log_id, OLD.stock_log_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.stock_log_id, OLD.stock_log_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock_log_totals
    AFTER INSERT OR UPDATE OR DELETE ON stock_log_items
    FOR EACH ROW EXECUTE FUNCTION update_stock_log_totals();

-- ============================================================================
-- WASTAGE LOGS
-- ============================================================================

CREATE TABLE wastage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Location (one must be set)
    shop_id UUID REFERENCES shops(id),
    storeroom_id UUID REFERENCES storerooms(id),
    
    wastage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    
    -- Cost at time of wastage
    cost_per_unit DECIMAL(12,4),
    total_cost DECIMAL(15,2),
    
    -- Reason
    reason TEXT NOT NULL,          -- 'expired', 'spoiled', 'damaged', 'prepared_unsold'
    description TEXT,
    
    image_url TEXT,
    
    -- Link to daily closing (if logged during wizard)
    daily_log_id UUID,             -- FK added in daily_operations.sql
    
    -- Link to stock movement (auto-created)
    stock_movement_id UUID REFERENCES stock_movements(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    CONSTRAINT wl_one_location CHECK (
        (shop_id IS NOT NULL AND storeroom_id IS NULL) OR
        (shop_id IS NULL AND storeroom_id IS NOT NULL)
    )
);

CREATE INDEX idx_wastage_org ON wastage_logs(org_id);
CREATE INDEX idx_wastage_shop ON wastage_logs(shop_id);
CREATE INDEX idx_wastage_date ON wastage_logs(wastage_date);
CREATE INDEX idx_wastage_item ON wastage_logs(item_id);

-- ============================================================================
-- THE SACRED FUNCTION: record_stock_movement()
-- ============================================================================
--
-- All stock changes MUST go through this function.
-- It atomically updates stock_levels AND creates the movement record.
-- This prevents the "central_stock updated but log missing" scenario.
--

CREATE OR REPLACE FUNCTION record_stock_movement(
    p_org_id UUID,
    p_item_id UUID,
    p_storeroom_id UUID,           -- Set this OR p_shop_id
    p_shop_id UUID,                -- Set this OR p_storeroom_id
    p_movement_type TEXT,
    p_movement_date DATE,
    p_quantity DECIMAL,            -- Positive for IN, negative for OUT
    p_cost_per_unit DECIMAL DEFAULT NULL,
    p_source_type TEXT DEFAULT NULL,
    p_source_id UUID DEFAULT NULL,
    p_batch_number TEXT DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_direction INTEGER;
    v_current_qty DECIMAL(12,3);
    v_current_avg_cost DECIMAL(12,4);
    v_new_qty DECIMAL(12,3);
    v_new_avg_cost DECIMAL(12,4);
    v_total_cost DECIMAL(15,2);
BEGIN
    -- Validate: exactly one location
    IF (p_storeroom_id IS NOT NULL AND p_shop_id IS NOT NULL) OR
       (p_storeroom_id IS NULL AND p_shop_id IS NULL) THEN
        RAISE EXCEPTION 'Exactly one of storeroom_id or shop_id must be provided';
    END IF;
    
    -- Get movement direction from lookup table
    SELECT direction INTO v_direction
    FROM stock_movement_types
    WHERE code = p_movement_type AND is_active = true;
    
    IF v_direction IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive movement type: %', p_movement_type;
    END IF;
    
    -- Ensure quantity sign matches direction
    -- direction=1 (in) needs positive, direction=-1 (out) needs negative
    IF v_direction = 1 AND p_quantity < 0 THEN
        p_quantity := ABS(p_quantity);  -- Auto-correct for convenience
    ELSIF v_direction = -1 AND p_quantity > 0 THEN
        p_quantity := -ABS(p_quantity); -- Auto-correct for convenience
    END IF;
    
    -- Get current stock level (or default to 0)
    SELECT quantity, avg_cost INTO v_current_qty, v_current_avg_cost
    FROM stock_levels
    WHERE item_id = p_item_id
      AND ((storeroom_id = p_storeroom_id AND p_storeroom_id IS NOT NULL) OR
           (shop_id = p_shop_id AND p_shop_id IS NOT NULL));
    
    IF NOT FOUND THEN
        v_current_qty := 0;
        v_current_avg_cost := 0;
    END IF;
    
    -- Calculate new quantity
    v_new_qty := v_current_qty + p_quantity;
    
    -- Prevent negative stock
    IF v_new_qty < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current=%, Requested=%, Item=%',
            v_current_qty, ABS(p_quantity), p_item_id;
    END IF;
    
    -- Calculate weighted average cost (only for incoming stock)
    IF p_quantity > 0 AND p_cost_per_unit IS NOT NULL AND p_cost_per_unit > 0 THEN
        IF v_new_qty > 0 THEN
            v_new_avg_cost := (
                (v_current_qty * COALESCE(v_current_avg_cost, 0)) +
                (p_quantity * p_cost_per_unit)
            ) / v_new_qty;
        ELSE
            v_new_avg_cost := p_cost_per_unit;
        END IF;
    ELSE
        v_new_avg_cost := COALESCE(v_current_avg_cost, p_cost_per_unit, 0);
    END IF;
    
    v_total_cost := ABS(p_quantity) * COALESCE(p_cost_per_unit, v_new_avg_cost, 0);
    
    -- ========== ATOMIC OPERATION ==========
    -- Both operations succeed or fail together
    
    -- Upsert stock level
    INSERT INTO stock_levels (
        org_id, item_id, storeroom_id, shop_id,
        quantity, avg_cost,
        last_movement_at, last_movement_type
    ) VALUES (
        p_org_id, p_item_id, p_storeroom_id, p_shop_id,
        v_new_qty, v_new_avg_cost,
        NOW(), p_movement_type
    )
    ON CONFLICT (item_id, storeroom_id, shop_id)
    DO UPDATE SET
        quantity = v_new_qty,
        avg_cost = v_new_avg_cost,
        last_movement_at = NOW(),
        last_movement_type = p_movement_type,
        updated_at = NOW();
    
    -- Create movement record
    INSERT INTO stock_movements (
        org_id, item_id, storeroom_id, shop_id,
        movement_type, movement_date,
        quantity, cost_per_unit, total_cost, balance_after,
        source_type, source_id,
        batch_number, expiry_date, notes, created_by
    ) VALUES (
        p_org_id, p_item_id, p_storeroom_id, p_shop_id,
        p_movement_type, p_movement_date,
        p_quantity, COALESCE(p_cost_per_unit, v_new_avg_cost), v_total_cost, v_new_qty,
        p_source_type, p_source_id,
        p_batch_number, p_expiry_date, p_notes, p_created_by
    )
    RETURNING id INTO v_movement_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER: Get current stock at a location
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stock_quantity(
    p_item_id UUID,
    p_storeroom_id UUID DEFAULT NULL,
    p_shop_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_qty DECIMAL(12,3);
BEGIN
    SELECT quantity INTO v_qty
    FROM stock_levels
    WHERE item_id = p_item_id
      AND ((storeroom_id = p_storeroom_id AND p_storeroom_id IS NOT NULL) OR
           (shop_id = p_shop_id AND p_shop_id IS NOT NULL));
    
    RETURN COALESCE(v_qty, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEW: Central Stock by Item (replaces central_stock field)
-- ============================================================================

CREATE OR REPLACE VIEW v_central_stock AS
SELECT 
    ii.id AS item_id,
    ii.org_id,
    ii.name AS item_name,
    ii.code AS item_code,
    u.abbreviation AS unit,
    COALESCE(SUM(sl.quantity), 0) AS total_central_stock,
    COALESCE(SUM(sl.quantity * sl.avg_cost), 0) AS total_value
FROM inventory_items ii
JOIN units_of_measure u ON ii.unit_id = u.id
LEFT JOIN stock_levels sl ON sl.item_id = ii.id AND sl.storeroom_id IS NOT NULL
WHERE ii.is_active = true
GROUP BY ii.id, ii.org_id, ii.name, ii.code, u.abbreviation;

-- ============================================================================
-- VIEW: Low Stock Items
-- ============================================================================

CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
    sl.org_id,
    ii.id AS item_id,
    ii.name AS item_name,
    ii.code AS item_code,
    sr.id AS storeroom_id,
    sr.name AS storeroom_name,
    s.id AS shop_id,
    s.name AS shop_name,
    sl.quantity AS current_stock,
    ii.min_stock_level,
    ii.reorder_level,
    u.abbreviation AS unit,
    CASE 
        WHEN sl.quantity <= 0 THEN 'out_of_stock'
        WHEN sl.quantity < ii.min_stock_level THEN 'critical'
        WHEN sl.quantity < COALESCE(ii.reorder_level, ii.min_stock_level * 1.5) THEN 'low'
        ELSE 'ok'
    END AS stock_status
FROM stock_levels sl
JOIN inventory_items ii ON sl.item_id = ii.id
JOIN units_of_measure u ON ii.unit_id = u.id
LEFT JOIN storerooms sr ON sl.storeroom_id = sr.id
LEFT JOIN shops s ON sl.shop_id = s.id
WHERE ii.is_active = true
  AND sl.quantity < COALESCE(ii.reorder_level, ii.min_stock_level, 0)
ORDER BY 
    CASE WHEN sl.quantity <= 0 THEN 0 ELSE 1 END,
    sl.quantity / NULLIF(ii.min_stock_level, 0);

COMMENT ON TABLE stock_levels IS 
'Single source of truth for current stock. Updated ONLY via record_stock_movement() to ensure consistency with stock_movements log.';

COMMENT ON FUNCTION record_stock_movement IS 
'The ONLY way to change stock. Atomically updates stock_levels and creates movement record.';

COMMENT ON VIEW v_central_stock IS 
'Replaces the denormalized central_stock field. Calculated from stock_levels.';
