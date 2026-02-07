-- ============================================================================
-- TRFC Schema v2.0 - Part 7: Business Logic Functions
-- ============================================================================
--
-- CRITICAL FUNCTIONS:
-- 1. calculate_payroll() - Server-side payroll calculation (THE authoritative source)
-- 2. process_daily_closing() - Process daily closing wizard data
-- 3. process_attendance_punches() - Convert raw punches to attendance records
--
-- These functions enforce business rules at the database level.
-- Frontend cannot bypass or tamper with these calculations.
--
-- ============================================================================

-- ============================================================================
-- PAYROLL CALCULATION
-- ============================================================================
--
-- This is THE definitive payroll calculation.
-- It cannot be bypassed by frontend.
-- All values are calculated server-side based on attendance data.
--

CREATE OR REPLACE FUNCTION calculate_payroll(
    p_employee_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_calculated_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_employee RECORD;
    v_shift RECORD;
    v_leave_policy RECORD;
    v_payroll_id UUID;
    
    -- Attendance counts
    v_total_days INTEGER;
    v_present_days DECIMAL(4,2) := 0;
    v_absent_days DECIMAL(4,2) := 0;
    v_half_days DECIMAL(4,2) := 0;
    v_paid_leaves DECIMAL(4,2) := 0;
    v_unpaid_leaves DECIMAL(4,2) := 0;
    v_late_days INTEGER := 0;
    v_overtime_minutes INTEGER := 0;
    
    -- Rate calculations
    v_daily_rate DECIMAL(12,2);
    v_hourly_rate DECIMAL(12,2);
    v_ot_rate DECIMAL(12,2);
    
    -- Earnings
    v_earnings_basic DECIMAL(12,2) := 0;
    v_earnings_ot DECIMAL(12,2) := 0;
    v_earnings_encashment DECIMAL(12,2) := 0;
    v_earnings_total DECIMAL(12,2) := 0;
    
    -- Deductions
    v_deductions_absent DECIMAL(12,2) := 0;
    v_deductions_late DECIMAL(12,2) := 0;
    v_deductions_advance DECIMAL(12,2) := 0;
    v_deductions_extra_leaves DECIMAL(12,2) := 0;
    v_deductions_total DECIMAL(12,2) := 0;
    
    -- Finals
    v_gross_pay DECIMAL(12,2);
    v_net_pay DECIMAL(12,2);
    
    -- Period
    v_period_month TEXT;
    
    -- Advance recovery
    v_advance RECORD;
    v_recovery_amount DECIMAL(12,2);
    
    -- Leave balance
    v_leave_balance RECORD;
BEGIN
    -- =========================================================================
    -- STEP 1: Get employee details
    -- =========================================================================
    SELECT * INTO v_employee
    FROM employees
    WHERE id = p_employee_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found: %', p_employee_id;
    END IF;
    
    IF v_employee.status != 'active' THEN
        RAISE EXCEPTION 'Employee % is not active', p_employee_id;
    END IF;
    
    -- =========================================================================
    -- STEP 2: Get shift details
    -- =========================================================================
    SELECT s.* INTO v_shift
    FROM shifts s
    JOIN shift_assignments sa ON sa.shift_id = s.id
    WHERE sa.employee_id = p_employee_id
      AND sa.effective_from <= p_period_end
      AND (sa.effective_to IS NULL OR sa.effective_to >= p_period_start)
    ORDER BY sa.effective_from DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Use default 8-hour shift if no assignment
        v_shift := ROW(NULL, NULL, '09:00', '21:00', 0, 8.0, 15, 15, 30, 1.5, 4.0);
    END IF;
    
    -- =========================================================================
    -- STEP 3: Calculate rates
    -- =========================================================================
    -- Standard: 26 working days per month
    v_daily_rate := v_employee.base_salary / 26;
    v_hourly_rate := v_daily_rate / COALESCE(v_shift.standard_hours, 8);
    v_ot_rate := v_hourly_rate * COALESCE(v_shift.ot_rate_multiplier, 1.5);
    
    -- =========================================================================
    -- STEP 4: Calculate total working days in period
    -- =========================================================================
    v_total_days := p_period_end - p_period_start + 1;
    v_period_month := TO_CHAR(p_period_start, 'YYYY-MM');
    
    -- =========================================================================
    -- STEP 5: Aggregate attendance
    -- =========================================================================
    SELECT 
        -- Present days (full)
        COALESCE(SUM(
            CASE WHEN ast.counts_as_present = 1.0 THEN 1 ELSE 0 END
        ), 0),
        -- Half days
        COALESCE(SUM(
            CASE WHEN ast.counts_as_present = 0.5 THEN 1 ELSE 0 END
        ), 0),
        -- Absent (excluding leaves)
        COALESCE(SUM(
            CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END
        ), 0),
        -- Paid leaves
        COALESCE(SUM(
            CASE WHEN ar.status = 'leave_paid' THEN 1 ELSE 0 END
        ), 0),
        -- Unpaid leaves
        COALESCE(SUM(
            CASE WHEN ar.status = 'leave_unpaid' THEN 1 ELSE 0 END
        ), 0),
        -- Late days (present but late)
        COALESCE(SUM(
            CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END
        ), 0),
        -- Total overtime minutes
        COALESCE(SUM(ar.overtime_minutes), 0)
    INTO 
        v_present_days, v_half_days, v_absent_days,
        v_paid_leaves, v_unpaid_leaves, v_late_days, v_overtime_minutes
    FROM attendance_records ar
    JOIN attendance_status_types ast ON ar.status = ast.code
    WHERE ar.employee_id = p_employee_id
      AND ar.attendance_date BETWEEN p_period_start AND p_period_end;
    
    -- =========================================================================
    -- STEP 6: Get leave balance for encashment
    -- =========================================================================
    SELECT * INTO v_leave_balance
    FROM leave_balances
    WHERE employee_id = p_employee_id
      AND year = EXTRACT(YEAR FROM p_period_start)::INTEGER
      AND month = EXTRACT(MONTH FROM p_period_start)::INTEGER;
    
    -- Get leave policy
    SELECT lp.* INTO v_leave_policy
    FROM leave_policies lp
    WHERE lp.org_id = v_employee.org_id
      AND lp.is_default = true
      AND lp.is_active = true
    LIMIT 1;
    
    -- =========================================================================
    -- STEP 7: Calculate EARNINGS
    -- =========================================================================
    
    -- Basic pay: days worked × daily rate
    v_earnings_basic := v_daily_rate * (
        v_present_days + 
        (v_half_days * 0.5) + 
        v_paid_leaves
    );
    
    -- Overtime pay
    v_earnings_ot := (v_overtime_minutes / 60.0) * v_ot_rate;
    
    -- Leave encashment (if policy allows and there's unused balance)
    IF v_leave_policy IS NOT NULL AND v_leave_policy.encash_unused 
       AND v_leave_balance IS NOT NULL AND v_leave_balance.remaining > 0 THEN
        v_earnings_encashment := v_leave_balance.remaining * v_daily_rate;
    END IF;
    
    v_earnings_total := v_earnings_basic + v_earnings_ot + v_earnings_encashment;
    
    -- =========================================================================
    -- STEP 8: Calculate DEDUCTIONS
    -- =========================================================================
    
    -- Absence deduction (unpaid days)
    v_deductions_absent := v_daily_rate * (v_absent_days + v_unpaid_leaves);
    
    -- Late penalty (if applicable - e.g., ₹50 per late day after 3 times)
    IF v_late_days > 3 THEN
        v_deductions_late := (v_late_days - 3) * 50;  -- Configurable per org
    END IF;
    
    -- Extra leaves (leaves taken beyond allocation)
    IF v_leave_balance IS NOT NULL AND v_leave_policy IS NOT NULL 
       AND v_leave_policy.deduct_extra_from_salary THEN
        IF (v_paid_leaves + v_unpaid_leaves) > (v_leave_balance.opening_balance + v_leave_balance.allocated) THEN
            v_deductions_extra_leaves := (
                (v_paid_leaves + v_unpaid_leaves) - 
                (v_leave_balance.opening_balance + v_leave_balance.allocated)
            ) * v_daily_rate;
        END IF;
    END IF;
    
    -- Advance recovery (unrecovered advances with auto_deduct)
    v_deductions_advance := 0;
    FOR v_advance IN 
        SELECT * FROM salary_advances
        WHERE employee_id = p_employee_id
          AND is_fully_recovered = false
          AND auto_deduct = true
        ORDER BY advance_date ASC
    LOOP
        IF v_advance.recovery_type = 'single' THEN
            v_recovery_amount := v_advance.remaining_amount;
        ELSE
            v_recovery_amount := LEAST(
                COALESCE(v_advance.installment_amount, v_advance.remaining_amount),
                v_advance.remaining_amount
            );
        END IF;
        v_deductions_advance := v_deductions_advance + v_recovery_amount;
    END LOOP;
    
    v_deductions_total := v_deductions_absent + v_deductions_late + 
                          v_deductions_advance + v_deductions_extra_leaves;
    
    -- =========================================================================
    -- STEP 9: Calculate final amounts
    -- =========================================================================
    v_gross_pay := v_earnings_total;
    v_net_pay := v_gross_pay - v_deductions_total;
    
    -- Ensure non-negative (deductions can't exceed earnings for this period)
    v_net_pay := GREATEST(v_net_pay, 0);
    
    -- =========================================================================
    -- STEP 10: Upsert payroll record
    -- =========================================================================
    INSERT INTO payroll_logs (
        org_id, employee_id,
        period_month, period_start, period_end,
        employee_name, employee_designation, base_salary, employment_type,
        total_days, present_days, absent_days, half_days,
        paid_leaves, unpaid_leaves, late_days, overtime_minutes,
        earnings_basic, earnings_overtime, earnings_leave_encashment,
        earnings_total,
        deductions_absent, deductions_late, deductions_advance, deductions_extra_leaves,
        deductions_total,
        gross_pay, net_pay,
        status, calculated_at, calculated_by
    ) VALUES (
        v_employee.org_id, p_employee_id,
        v_period_month, p_period_start, p_period_end,
        v_employee.name, v_employee.designation, v_employee.base_salary, v_employee.employment_type,
        v_total_days, v_present_days, v_absent_days, v_half_days,
        v_paid_leaves, v_unpaid_leaves, v_late_days, v_overtime_minutes,
        v_earnings_basic, v_earnings_ot, v_earnings_encashment,
        v_earnings_total,
        v_deductions_absent, v_deductions_late, v_deductions_advance, v_deductions_extra_leaves,
        v_deductions_total,
        v_gross_pay, v_net_pay,
        'calculated', NOW(), p_calculated_by
    )
    ON CONFLICT (employee_id, period_month)
    DO UPDATE SET
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        employee_name = EXCLUDED.employee_name,
        employee_designation = EXCLUDED.employee_designation,
        base_salary = EXCLUDED.base_salary,
        employment_type = EXCLUDED.employment_type,
        total_days = EXCLUDED.total_days,
        present_days = EXCLUDED.present_days,
        absent_days = EXCLUDED.absent_days,
        half_days = EXCLUDED.half_days,
        paid_leaves = EXCLUDED.paid_leaves,
        unpaid_leaves = EXCLUDED.unpaid_leaves,
        late_days = EXCLUDED.late_days,
        overtime_minutes = EXCLUDED.overtime_minutes,
        earnings_basic = EXCLUDED.earnings_basic,
        earnings_overtime = EXCLUDED.earnings_overtime,
        earnings_leave_encashment = EXCLUDED.earnings_leave_encashment,
        earnings_total = EXCLUDED.earnings_total,
        deductions_absent = EXCLUDED.deductions_absent,
        deductions_late = EXCLUDED.deductions_late,
        deductions_advance = EXCLUDED.deductions_advance,
        deductions_extra_leaves = EXCLUDED.deductions_extra_leaves,
        deductions_total = EXCLUDED.deductions_total,
        gross_pay = EXCLUDED.gross_pay,
        net_pay = EXCLUDED.net_pay,
        status = 'calculated',
        calculated_at = NOW(),
        calculated_by = EXCLUDED.calculated_by,
        updated_at = NOW()
    WHERE payroll_logs.status = 'draft' OR payroll_logs.status = 'calculated'
    RETURNING id INTO v_payroll_id;
    
    IF v_payroll_id IS NULL THEN
        -- Record exists and is finalized/paid - get the ID
        SELECT id INTO v_payroll_id
        FROM payroll_logs
        WHERE employee_id = p_employee_id AND period_month = v_period_month;
        
        RAISE NOTICE 'Payroll already finalized/paid for employee % month %. No changes made.', 
            p_employee_id, v_period_month;
    END IF;
    
    RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FINALIZE PAYROLL
-- ============================================================================

CREATE OR REPLACE FUNCTION finalize_payroll(
    p_payroll_id UUID,
    p_verified_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE payroll_logs
    SET 
        status = 'finalized',
        verified_at = NOW(),
        verified_by = p_verified_by,
        updated_at = NOW()
    WHERE id = p_payroll_id
      AND status = 'calculated';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MARK PAYROLL PAID (and process advance recoveries)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_payroll_paid(
    p_payroll_id UUID,
    p_paid_by UUID,
    p_payment_method_id UUID DEFAULT NULL,
    p_payment_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_payroll RECORD;
    v_advance RECORD;
    v_recovery_amount DECIMAL(12,2);
    v_cumulative DECIMAL(12,2);
BEGIN
    -- Get payroll details
    SELECT * INTO v_payroll
    FROM payroll_logs
    WHERE id = p_payroll_id AND status = 'finalized';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll % not found or not finalized', p_payroll_id;
    END IF;
    
    -- Update payroll status
    UPDATE payroll_logs
    SET 
        status = 'paid',
        paid_at = NOW(),
        paid_by = p_paid_by,
        payment_method_id = p_payment_method_id,
        payment_reference = p_payment_reference,
        updated_at = NOW()
    WHERE id = p_payroll_id;
    
    -- Process advance recoveries
    FOR v_advance IN 
        SELECT * FROM salary_advances
        WHERE employee_id = v_payroll.employee_id
          AND is_fully_recovered = false
          AND auto_deduct = true
        ORDER BY advance_date ASC
    LOOP
        IF v_advance.recovery_type = 'single' THEN
            v_recovery_amount := v_advance.remaining_amount;
        ELSE
            v_recovery_amount := LEAST(
                COALESCE(v_advance.installment_amount, v_advance.remaining_amount),
                v_advance.remaining_amount
            );
        END IF;
        
        -- Update advance
        UPDATE salary_advances
        SET recovered_amount = recovered_amount + v_recovery_amount,
            updated_at = NOW()
        WHERE id = v_advance.id;
        
        -- Get cumulative for log
        SELECT recovered_amount INTO v_cumulative
        FROM salary_advances WHERE id = v_advance.id;
        
        -- Create recovery log
        INSERT INTO advance_recovery_logs (
            advance_id, payroll_id, recovery_date, amount,
            cumulative_recovered, remaining_after
        ) VALUES (
            v_advance.id, p_payroll_id, CURRENT_DATE, v_recovery_amount,
            v_cumulative, v_advance.amount - v_cumulative
        );
    END LOOP;
    
    -- Finalize leave balance for the month
    UPDATE leave_balances
    SET 
        is_finalized = true,
        finalized_at = NOW(),
        updated_at = NOW()
    WHERE employee_id = v_payroll.employee_id
      AND year = EXTRACT(YEAR FROM v_payroll.period_start)::INTEGER
      AND month = EXTRACT(MONTH FROM v_payroll.period_start)::INTEGER;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BATCH PAYROLL CALCULATION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payroll_batch(
    p_org_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_shop_id UUID DEFAULT NULL,
    p_calculated_by UUID DEFAULT NULL
)
RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    payroll_id UUID,
    net_pay DECIMAL,
    status TEXT
) AS $$
DECLARE
    v_employee RECORD;
    v_payroll_id UUID;
BEGIN
    FOR v_employee IN 
        SELECT e.id, e.name
        FROM employees e
        WHERE e.org_id = p_org_id
          AND e.status = 'active'
          AND (p_shop_id IS NULL OR e.shop_id = p_shop_id)
          AND e.join_date <= p_period_end
          AND (e.exit_date IS NULL OR e.exit_date >= p_period_start)
        ORDER BY e.name
    LOOP
        BEGIN
            v_payroll_id := calculate_payroll(
                v_employee.id, p_period_start, p_period_end, p_calculated_by
            );
            
            RETURN QUERY
            SELECT 
                v_employee.id,
                v_employee.name,
                v_payroll_id,
                pl.net_pay,
                'success'::TEXT
            FROM payroll_logs pl
            WHERE pl.id = v_payroll_id;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY
            SELECT 
                v_employee.id,
                v_employee.name,
                NULL::UUID,
                0::DECIMAL,
                'error: ' || SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCESS ATTENDANCE FROM RAW PUNCHES
-- ============================================================================

CREATE OR REPLACE FUNCTION process_attendance_for_date(
    p_org_id UUID,
    p_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_processed INTEGER := 0;
    v_emp RECORD;
    v_shift RECORD;
    v_punches TIMESTAMPTZ[];
    v_punch_in TIMESTAMPTZ;
    v_punch_out TIMESTAMPTZ;
    v_status TEXT;
    v_work_hours DECIMAL(4,2);
    v_late_minutes INTEGER;
    v_overtime_minutes INTEGER;
    v_shift_start TIMESTAMPTZ;
    v_shift_end TIMESTAMPTZ;
BEGIN
    -- Process each employee who has punches for this date
    FOR v_emp IN 
        SELECT DISTINCT e.id AS employee_id, e.external_empcode
        FROM employees e
        WHERE e.org_id = p_org_id
          AND e.status = 'active'
          AND e.external_empcode IS NOT NULL
    LOOP
        -- Get punches for this employee on this date
        SELECT ARRAY_AGG(rpr.punch_time ORDER BY rpr.punch_time)
        INTO v_punches
        FROM raw_punch_records rpr
        WHERE rpr.org_id = p_org_id
          AND rpr.empcode = v_emp.external_empcode
          AND rpr.punch_time::DATE = p_date
          AND rpr.processed = false;
        
        IF v_punches IS NULL OR array_length(v_punches, 1) = 0 THEN
            CONTINUE;
        END IF;
        
        -- First punch = in, last punch = out
        v_punch_in := v_punches[1];
        v_punch_out := v_punches[array_length(v_punches, 1)];
        
        -- Get shift for this employee
        SELECT s.* INTO v_shift
        FROM shifts s
        JOIN shift_assignments sa ON sa.shift_id = s.id
        WHERE sa.employee_id = v_emp.employee_id
          AND sa.effective_from <= p_date
          AND (sa.effective_to IS NULL OR sa.effective_to >= p_date)
        LIMIT 1;
        
        IF v_shift IS NULL THEN
            -- Default shift
            v_shift := ROW(NULL, NULL, '09:00', '21:00', 0, 8.0, 15, 15, 30, 1.5, 4.0);
        END IF;
        
        -- Calculate shift times for this date
        v_shift_start := p_date + v_shift.start_time;
        v_shift_end := p_date + v_shift.end_time;
        
        -- Handle overnight shifts
        IF v_shift.end_time < v_shift.start_time THEN
            v_shift_end := v_shift_end + INTERVAL '1 day';
        END IF;
        
        -- Calculate work hours
        IF v_punch_out > v_punch_in THEN
            v_work_hours := EXTRACT(EPOCH FROM (v_punch_out - v_punch_in)) / 3600.0;
            v_work_hours := v_work_hours - (COALESCE(v_shift.break_minutes, 0) / 60.0);
        ELSE
            v_work_hours := 0;
        END IF;
        
        -- Calculate late minutes
        IF v_punch_in > (v_shift_start + (COALESCE(v_shift.late_grace_minutes, 15) || ' minutes')::INTERVAL) THEN
            v_late_minutes := EXTRACT(EPOCH FROM (v_punch_in - v_shift_start)) / 60;
        ELSE
            v_late_minutes := 0;
        END IF;
        
        -- Calculate overtime
        IF v_work_hours > v_shift.standard_hours + (COALESCE(v_shift.ot_threshold_minutes, 30) / 60.0) THEN
            v_overtime_minutes := (v_work_hours - v_shift.standard_hours) * 60;
        ELSE
            v_overtime_minutes := 0;
        END IF;
        
        -- Determine status
        IF v_work_hours >= v_shift.standard_hours * 0.9 THEN
            IF v_late_minutes > 0 THEN
                v_status := 'late';
            ELSE
                v_status := 'present';
            END IF;
        ELSIF v_work_hours >= COALESCE(v_shift.half_day_hours, v_shift.standard_hours / 2) THEN
            v_status := 'half_day';
        ELSE
            v_status := 'absent';
        END IF;
        
        -- Upsert attendance record
        INSERT INTO attendance_records (
            employee_id, attendance_date,
            punch_in, punch_out, all_punches,
            status, work_hours, late_minutes, overtime_minutes
        ) VALUES (
            v_emp.employee_id, p_date,
            v_punch_in, v_punch_out, v_punches,
            v_status, ROUND(v_work_hours, 2), v_late_minutes, v_overtime_minutes
        )
        ON CONFLICT (employee_id, attendance_date)
        DO UPDATE SET
            punch_in = EXCLUDED.punch_in,
            punch_out = EXCLUDED.punch_out,
            all_punches = EXCLUDED.all_punches,
            status = EXCLUDED.status,
            work_hours = EXCLUDED.work_hours,
            late_minutes = EXCLUDED.late_minutes,
            overtime_minutes = EXCLUDED.overtime_minutes,
            updated_at = NOW();
        
        -- Mark raw punches as processed
        UPDATE raw_punch_records
        SET processed = true, processed_at = NOW()
        WHERE org_id = p_org_id
          AND empcode = v_emp.external_empcode
          AND punch_time::DATE = p_date;
        
        v_processed := v_processed + 1;
    END LOOP;
    
    RETURN v_processed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCESS DAILY CLOSING
-- ============================================================================
-- 
-- This function creates ledger entries from a verified daily sales log.
--

CREATE OR REPLACE FUNCTION process_daily_closing(
    p_daily_log_id UUID,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_log RECORD;
    v_shop RECORD;
    v_cash_account_id UUID;
    v_sales_account_id UUID;
    v_batch_id UUID;
    v_entries JSONB := '[]'::JSONB;
    v_entry RECORD;
BEGIN
    -- Get the daily log
    SELECT * INTO v_log
    FROM daily_sales_logs
    WHERE id = p_daily_log_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daily sales log not found: %', p_daily_log_id;
    END IF;
    
    IF v_log.status != 'verified' THEN
        RAISE EXCEPTION 'Daily log must be verified before processing. Current status: %', v_log.status;
    END IF;
    
    IF v_log.ledger_batch_id IS NOT NULL THEN
        RAISE EXCEPTION 'Daily log already processed. Batch: %', v_log.ledger_batch_id;
    END IF;
    
    -- Get shop
    SELECT * INTO v_shop FROM shops WHERE id = v_log.shop_id;
    
    -- Get cash account for this shop
    SELECT id INTO v_cash_account_id
    FROM accounts
    WHERE shop_id = v_log.shop_id
      AND name LIKE 'Cash -%'
      AND account_type = 'asset'
    LIMIT 1;
    
    -- Get sales account for this shop
    SELECT id INTO v_sales_account_id
    FROM accounts
    WHERE shop_id = v_log.shop_id
      AND name LIKE 'Sales -%'
      AND account_type = 'revenue'
    LIMIT 1;
    
    IF v_cash_account_id IS NULL OR v_sales_account_id IS NULL THEN
        RAISE EXCEPTION 'Missing Cash or Sales account for shop %', v_shop.name;
    END IF;
    
    -- Build ledger entries
    -- 1. Cash sales: Debit Cash, Credit Sales
    IF v_log.cash_sales > 0 THEN
        v_entries := v_entries || jsonb_build_object(
            'account_id', v_cash_account_id,
            'debit', v_log.cash_sales,
            'credit', 0,
            'description', 'Cash sales - ' || v_shop.name || ' - ' || v_log.log_date
        );
        
        v_entries := v_entries || jsonb_build_object(
            'account_id', v_sales_account_id,
            'debit', 0,
            'credit', v_log.cash_sales,
            'description', 'Cash sales - ' || v_shop.name || ' - ' || v_log.log_date
        );
    END IF;
    
    -- 2. Non-cash sales entries would go to respective accounts...
    -- (Simplified for now - full implementation would iterate sales_entries)
    
    -- Create ledger batch
    IF jsonb_array_length(v_entries) >= 2 THEN
        v_batch_id := create_ledger_batch(
            v_log.org_id,
            v_log.log_date,
            'daily_sales',
            p_daily_log_id,
            v_log.shop_id,
            v_entries,
            p_created_by
        );
        
        -- Update daily log with batch ID and lock it
        UPDATE daily_sales_logs
        SET 
            ledger_batch_id = v_batch_id,
            status = 'locked',
            locked_at = NOW(),
            updated_at = NOW()
        WHERE id = p_daily_log_id;
    END IF;
    
    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_payroll IS 
'THE definitive payroll calculation. Cannot be bypassed. All values calculated server-side from attendance data.';

COMMENT ON FUNCTION process_attendance_for_date IS 
'Converts raw punch records into attendance records with calculated status, work hours, late minutes, and overtime.';

COMMENT ON FUNCTION process_daily_closing IS 
'Creates balanced ledger entries from a verified daily sales log. Locks the log after processing.';
