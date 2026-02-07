-- ============================================================================
-- TRFC Schema Fixes
-- Addresses missing tables and lookup values found during schema analysis
-- ============================================================================

-- ============================================================================
-- 1. Add missing 'aggregator' payment method type
-- ============================================================================

INSERT INTO payment_method_types (code, name, is_cash, is_online, commission_default, description)
VALUES ('aggregator', 'Aggregator', false, false, 0, 'Food delivery aggregator platform')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. Create leave_policies table (referenced but not created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Leave allocation
    paid_leaves_per_month DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    max_carry_forward INTEGER DEFAULT 2,
    
    -- Encashment rules
    encash_unused BOOLEAN DEFAULT true,
    encashment_rate DECIMAL(5,2) DEFAULT 1.0, -- Multiplier (1.0 = full day rate)
    
    -- Deduction rules
    deduct_extra_leaves BOOLEAN DEFAULT true,
    half_day_threshold_minutes INTEGER DEFAULT 240, -- 4 hours = half day
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_leave_policies_org ON leave_policies(org_id);

CREATE TRIGGER trg_leave_policies_updated_at 
    BEFORE UPDATE ON leave_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. Create raw_punch_records table (for attendance API sync)
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_punch_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Source identification
    api_config_id UUID REFERENCES attendance_api_configs(id),
    external_emp_code TEXT NOT NULL,
    
    -- Punch data
    punch_datetime TIMESTAMPTZ NOT NULL,
    punch_date DATE GENERATED ALWAYS AS (punch_datetime::date) STORED,
    punch_type TEXT, -- 'in', 'out', or null if unknown
    
    -- Raw data from API
    raw_data JSONB,
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    matched_employee_id UUID REFERENCES employees(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate punches
    UNIQUE(org_id, external_emp_code, punch_datetime)
);

CREATE INDEX IF NOT EXISTS idx_raw_punches_org_date ON raw_punch_records(org_id, punch_date);
CREATE INDEX IF NOT EXISTS idx_raw_punches_unprocessed ON raw_punch_records(org_id) WHERE is_processed = false;
CREATE INDEX IF NOT EXISTS idx_raw_punches_emp_code ON raw_punch_records(external_emp_code);

-- ============================================================================
-- 4. RLS Policies for new tables
-- ============================================================================

ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_punch_records ENABLE ROW LEVEL SECURITY;

-- Leave policies: read by all, write by owners
CREATE POLICY "leave_policies_select" ON leave_policies
    FOR SELECT USING (org_id = auth.user_org_id());

CREATE POLICY "leave_policies_insert" ON leave_policies
    FOR INSERT WITH CHECK (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY "leave_policies_update" ON leave_policies
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY "leave_policies_delete" ON leave_policies
    FOR DELETE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- Raw punch records: read by managers+, write by system only
CREATE POLICY "raw_punches_select" ON raw_punch_records
    FOR SELECT USING (org_id = auth.user_org_id() AND auth.has_permission('attendance.view'));

CREATE POLICY "raw_punches_insert" ON raw_punch_records
    FOR INSERT WITH CHECK (org_id = auth.user_org_id() AND auth.is_owner());

CREATE POLICY "raw_punches_update" ON raw_punch_records
    FOR UPDATE USING (org_id = auth.user_org_id() AND auth.is_owner());

-- ============================================================================
-- 5. Comments
-- ============================================================================

COMMENT ON TABLE leave_policies IS 'Leave allocation and encashment rules per organization';
COMMENT ON TABLE raw_punch_records IS 'Raw attendance punches from external APIs before processing';
