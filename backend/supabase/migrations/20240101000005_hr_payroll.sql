-- ============================================================================
-- TRFC Schema v2.0 - Part 5: HR & Payroll
-- ============================================================================
--
-- This file covers:
-- - Employees (separate from auth users)
-- - Shifts and assignments
-- - Attendance (from eTimeOffice API)
-- - Leave management
-- - Salary advances
-- - Payroll (server-side calculations!)
--
-- ============================================================================

-- ============================================================================
-- EMPLOYEES
-- ============================================================================
--
-- Employees are NOT the same as auth users.
-- An employee may or may not have system access (profile).
-- A profile may link to an employee record.
--
-- Note on profiles.employee_id bidirectional link:
-- This is acceptable for v1. Future refactor would use:
-- - people (identity)
-- - employment_contracts (employment periods)
--

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id),
    
    -- Basic info
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    
    -- ID proof (masked in UI: XXXX-XXXX-1234)
    aadhar_number TEXT,
    
    -- Role at shop (not system role)
    designation TEXT,  -- "Kitchen", "Server", "Manager", "Cashier"
    
    -- Employment type
    employment_type employment_type NOT NULL DEFAULT 'monthly',
    base_salary DECIMAL(12,2) NOT NULL,
    
    -- For daily wage workers
    daily_rate DECIMAL(12,2),
    
    -- External system mapping (eTimeOffice)
    external_empcode TEXT,
    empcode_linked_at TIMESTAMPTZ,
    
    -- Employment dates
    join_date DATE NOT NULL,
    exit_date DATE,
    
    -- Status (not using enum - could expand)
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    
    -- Bank details for salary payment
    bank_name TEXT,
    bank_account TEXT,
    bank_ifsc TEXT,
    upi_id TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_org ON employees(org_id);
CREATE INDEX idx_employees_shop ON employees(shop_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_empcode ON employees(external_empcode) WHERE external_empcode IS NOT NULL;

CREATE TRIGGER trg_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK from profiles to employees
ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================================
-- SHIFTS
-- ============================================================================

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,           -- "Morning", "Evening", "Full Day"
    
    start_time TIME NOT NULL,     -- "09:00"
    end_time TIME NOT NULL,       -- "21:00"
    
    -- Break (not counted in work hours)
    break_minutes INTEGER DEFAULT 0,
    
    -- Standard work hours (for calculations)
    standard_hours DECIMAL(4,2) NOT NULL,  -- 8.0, 12.0
    
    -- Tolerance rules
    late_grace_minutes INTEGER DEFAULT 15,
    early_leave_grace_minutes INTEGER DEFAULT 15,
    
    -- OT kicks in after standard hours + this buffer
    ot_threshold_minutes INTEGER DEFAULT 30,
    
    -- OT rate multiplier (1.5 = time and a half)
    ot_rate_multiplier DECIMAL(3,2) DEFAULT 1.5,
    
    -- For half-day calculations
    half_day_hours DECIMAL(4,2),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shifts_org ON shifts(org_id);

CREATE TRIGGER trg_shifts_updated_at 
    BEFORE UPDATE ON shifts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SHIFT ASSIGNMENTS
-- ============================================================================

CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    
    -- Schedule type
    schedule_type TEXT DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'rotating', 'flexible')),
    
    -- Effective period
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,  -- NULL = currently active
    
    -- For specific days (NULL = all days)
    applicable_days INTEGER[],  -- {1,2,3,4,5} = Mon-Fri
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- No overlapping assignments for same employee
    CONSTRAINT no_overlapping_shifts EXCLUDE USING gist (
        employee_id WITH =,
        daterange(effective_from, COALESCE(effective_to, '9999-12-31')) WITH &&
    )
);

CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);

-- ============================================================================
-- ATTENDANCE API CONFIGS (eTimeOffice Integration)
-- ============================================================================

CREATE TABLE attendance_api_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,           -- "eTimeOffice - Main"
    
    -- API details
    base_url TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    
    -- Query params (JSONB is fine here - config, rarely queried)
    query_params JSONB DEFAULT '{}'::jsonb,
    
    -- Authentication
    auth_type TEXT DEFAULT 'bearer',
    bearer_token TEXT,            -- Should be encrypted in production!
    
    -- Response mapping (how to extract data from API response)
    -- JSONB is fine here - true metadata
    response_mapping JSONB DEFAULT '{
        "punch_list_path": "notificationList",
        "empcode_field": "empcode",
        "name_field": "name",
        "punch_date_field": "punchDate",
        "date_format": "DD/MM/YYYY HH:mm:ss"
    }'::jsonb,
    
    -- Linked shop (optional)
    shop_id UUID REFERENCES shops(id),
    
    -- Sync settings
    auto_sync_enabled BOOLEAN DEFAULT false,
    sync_interval_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    last_sync_error TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_api_org ON attendance_api_configs(org_id);

CREATE TRIGGER trg_attendance_api_updated_at 
    BEFORE UPDATE ON attendance_api_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- UNMAPPED EMPCODES (From API but not linked to employee)
-- ============================================================================

CREATE TABLE unmapped_empcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    api_config_id UUID REFERENCES attendance_api_configs(id),
    
    empcode TEXT NOT NULL,
    name_from_api TEXT,           -- Name as received from API
    
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    punch_count INTEGER DEFAULT 1,
    
    -- Resolution
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'ignored')),
    mapped_to_employee_id UUID REFERENCES employees(id),
    mapped_at TIMESTAMPTZ,
    mapped_by UUID REFERENCES profiles(id),
    
    UNIQUE(org_id, empcode)
);

CREATE INDEX idx_unmapped_org ON unmapped_empcodes(org_id);
CREATE INDEX idx_unmapped_status ON unmapped_empcodes(status) WHERE status = 'pending';

-- ============================================================================
-- RAW PUNCH RECORDS (Preserve API data)
-- ============================================================================

CREATE TABLE raw_punch_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    api_config_id UUID REFERENCES attendance_api_configs(id),
    
    empcode TEXT NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    
    -- Raw data from API (JSONB is fine - archival, rarely queried)
    raw_data JSONB,
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    attendance_record_id UUID,  -- FK added after table
    
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(org_id, empcode, punch_time)
);

CREATE INDEX idx_raw_punch_org ON raw_punch_records(org_id);
CREATE INDEX idx_raw_punch_unprocessed ON raw_punch_records(processed) WHERE processed = false;
CREATE INDEX idx_raw_punch_time ON raw_punch_records(punch_time);

-- ============================================================================
-- ATTENDANCE RECORDS (Daily attendance per employee)
-- ============================================================================

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    
    -- Punch times
    punch_in TIMESTAMPTZ,
    punch_out TIMESTAMPTZ,
    
    -- All punches (for audit)
    all_punches TIMESTAMPTZ[],
    
    -- Calculated status (using lookup table)
    status TEXT NOT NULL DEFAULT 'absent' REFERENCES attendance_status_types(code),
    
    -- Work metrics
    work_hours DECIMAL(4,2) DEFAULT 0,
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    
    -- Manual override
    is_manual_entry BOOLEAN DEFAULT false,
    manual_notes TEXT,
    
    -- Source
    synced_from_api_id UUID REFERENCES attendance_api_configs(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per employee per day
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);

CREATE TRIGGER trg_attendance_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK from raw_punch_records
ALTER TABLE raw_punch_records
    ADD CONSTRAINT fk_raw_punch_attendance
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE SET NULL;

-- ============================================================================
-- LEAVE POLICIES
-- ============================================================================

CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,           -- "Standard Policy"
    
    -- Monthly allocation
    paid_leaves_per_month DECIMAL(4,2) DEFAULT 2,
    
    -- Carryover
    max_carryover DECIMAL(4,2) DEFAULT 0,
    
    -- Encashment
    encash_unused BOOLEAN DEFAULT true,
    
    -- Extra leave deduction
    deduct_extra_from_salary BOOLEAN DEFAULT true,
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_policies_org ON leave_policies(org_id);

CREATE TRIGGER trg_leave_policies_updated_at 
    BEFORE UPDATE ON leave_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- LEAVE BALANCES (Monthly tracking)
-- ============================================================================

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    -- Opening = Previous month's remaining + carryover
    opening_balance DECIMAL(4,2) DEFAULT 0,
    
    -- Monthly allocation
    allocated DECIMAL(4,2) DEFAULT 0,
    
    -- Usage
    used_paid DECIMAL(4,2) DEFAULT 0,
    used_unpaid DECIMAL(4,2) DEFAULT 0,
    
    -- Closing = Opening + Allocated - Used_Paid
    remaining DECIMAL(4,2) DEFAULT 0,
    
    -- At month end
    encashed DECIMAL(4,2) DEFAULT 0,
    carried_forward DECIMAL(4,2) DEFAULT 0,
    
    -- Status
    is_finalized BOOLEAN DEFAULT false,
    finalized_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, year, month)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_period ON leave_balances(year, month);

CREATE TRIGGER trg_leave_balances_updated_at 
    BEFORE UPDATE ON leave_balances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SALARY ADVANCES
-- ============================================================================

CREATE TABLE salary_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    
    -- Recovery settings
    recovery_type TEXT NOT NULL DEFAULT 'single' CHECK (recovery_type IN ('single', 'installments')),
    installment_amount DECIMAL(12,2),
    total_installments INTEGER,
    
    -- Tracking
    recovered_amount DECIMAL(12,2) DEFAULT 0,
    remaining_amount DECIMAL(12,2),  -- Set by trigger
    
    -- Auto-deduct from payroll
    auto_deduct BOOLEAN DEFAULT true,
    
    -- Status
    is_fully_recovered BOOLEAN DEFAULT false,
    
    -- Ledger link
    ledger_batch_id UUID,
    
    -- Audit
    given_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_advances_employee ON salary_advances(employee_id);
CREATE INDEX idx_advances_active ON salary_advances(is_fully_recovered) WHERE is_fully_recovered = false;

CREATE TRIGGER trg_advances_updated_at 
    BEFORE UPDATE ON salary_advances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to set remaining_amount
CREATE OR REPLACE FUNCTION set_advance_remaining()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_amount := NEW.amount - COALESCE(NEW.recovered_amount, 0);
    NEW.is_fully_recovered := (NEW.remaining_amount <= 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_advance_remaining
    BEFORE INSERT OR UPDATE ON salary_advances
    FOR EACH ROW EXECUTE FUNCTION set_advance_remaining();

-- ============================================================================
-- ADVANCE RECOVERY LOGS
-- ============================================================================

CREATE TABLE advance_recovery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advance_id UUID NOT NULL REFERENCES salary_advances(id) ON DELETE CASCADE,
    payroll_id UUID,  -- FK added after payroll_logs
    
    recovery_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    
    -- Running totals after this recovery
    cumulative_recovered DECIMAL(12,2),
    remaining_after DECIMAL(12,2),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recovery_advance ON advance_recovery_logs(advance_id);
CREATE INDEX idx_recovery_payroll ON advance_recovery_logs(payroll_id);

-- ============================================================================
-- PAYROLL LOGS (The Monthly Payroll Record)
-- ============================================================================
--
-- CRITICAL: Payroll calculations MUST be server-side!
-- The calculate_payroll() function is the ONLY way to generate these values.
--
-- Why server-side?
-- - Prevents frontend tampering
-- - Ensures consistent calculations
-- - Creates audit trail
--

CREATE TABLE payroll_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Period
    period_month TEXT NOT NULL,   -- "2026-01" (for easy filtering)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Employee snapshot (at time of calculation)
    employee_name TEXT NOT NULL,
    employee_designation TEXT,
    base_salary DECIMAL(12,2) NOT NULL,
    employment_type employment_type NOT NULL,
    
    -- Attendance summary (calculated from attendance_records)
    total_days INTEGER NOT NULL,
    present_days DECIMAL(4,2) DEFAULT 0,
    absent_days DECIMAL(4,2) DEFAULT 0,
    half_days DECIMAL(4,2) DEFAULT 0,
    paid_leaves DECIMAL(4,2) DEFAULT 0,
    unpaid_leaves DECIMAL(4,2) DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    
    -- Earnings (JSONB for detail, but key fields denormalized)
    earnings_basic DECIMAL(12,2) DEFAULT 0,
    earnings_overtime DECIMAL(12,2) DEFAULT 0,
    earnings_leave_encashment DECIMAL(12,2) DEFAULT 0,
    earnings_bonus DECIMAL(12,2) DEFAULT 0,
    earnings_other DECIMAL(12,2) DEFAULT 0,
    earnings_total DECIMAL(12,2) DEFAULT 0,
    
    -- Deductions (JSONB for detail, but key fields denormalized)
    deductions_absent DECIMAL(12,2) DEFAULT 0,
    deductions_late DECIMAL(12,2) DEFAULT 0,
    deductions_advance DECIMAL(12,2) DEFAULT 0,
    deductions_extra_leaves DECIMAL(12,2) DEFAULT 0,
    deductions_other DECIMAL(12,2) DEFAULT 0,
    deductions_total DECIMAL(12,2) DEFAULT 0,
    
    -- Final amounts
    gross_pay DECIMAL(12,2) DEFAULT 0,
    net_pay DECIMAL(12,2) DEFAULT 0,
    
    -- Workflow
    status payroll_status DEFAULT 'draft',
    
    -- Calculation audit
    calculated_at TIMESTAMPTZ,
    calculated_by UUID REFERENCES profiles(id),
    
    -- Verification
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    
    -- Payment
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES profiles(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    payment_reference TEXT,
    
    -- Ledger link
    ledger_batch_id UUID,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One payroll per employee per month
    UNIQUE(employee_id, period_month)
);

CREATE INDEX idx_payroll_org ON payroll_logs(org_id);
CREATE INDEX idx_payroll_employee ON payroll_logs(employee_id);
CREATE INDEX idx_payroll_period ON payroll_logs(period_month);
CREATE INDEX idx_payroll_status ON payroll_logs(status);

CREATE TRIGGER trg_payroll_updated_at 
    BEFORE UPDATE ON payroll_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK from advance_recovery_logs
ALTER TABLE advance_recovery_logs
    ADD CONSTRAINT fk_recovery_payroll
    FOREIGN KEY (payroll_id) REFERENCES payroll_logs(id) ON DELETE SET NULL;

COMMENT ON TABLE payroll_logs IS 
'Monthly payroll records. ALL calculations done by calculate_payroll() function. Direct writes bypass integrity checks.';

COMMENT ON TABLE attendance_records IS 
'Daily attendance per employee. Status uses lookup table for extensibility.';

COMMENT ON TABLE salary_advances IS 
'Salary advances with auto-recovery tracking via triggers.';
