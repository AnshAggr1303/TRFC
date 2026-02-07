-- ============================================================================
-- TRFC Schema v2.0 - Part 6: System Tables
-- ============================================================================
--
-- This file covers:
-- - Activity logs (audit trail)
-- - Notifications
--
-- REMOVED from v1 (to simplify Phase 1):
-- - utility_readings
-- - investments  
-- - recurring_expenses
-- - backup_configs (will add when implementing backups)
--
-- ============================================================================

-- ============================================================================
-- ACTIVITY LOGS (Comprehensive Audit Trail)
-- ============================================================================
--
-- Every significant action is logged here.
-- Uses lookup table for action types (extensible).
--
-- The "changes" field is JSONB - this is appropriate because:
-- - We rarely query individual field changes
-- - It's truly auxiliary/archival data
-- - Structure varies by entity type
--

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- When
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Who
    user_id UUID REFERENCES profiles(id),
    user_name TEXT,               -- Denormalized for quick display
    user_role TEXT,
    
    -- What action (using lookup table)
    action TEXT NOT NULL REFERENCES activity_action_types(code),
    
    -- What entity
    entity_type TEXT NOT NULL,    -- 'expense', 'daily_sales_log', 'employee', etc.
    entity_id UUID,
    entity_name TEXT,             -- Human-readable: "Expense #123", "Daily Log - TRK Jan 23"
    
    -- Where (optional shop context)
    shop_id UUID REFERENCES shops(id),
    
    -- Change details (for updates) - JSONB is appropriate here
    changes JSONB,                -- [{"field": "amount", "old": 100, "new": 150}]
    
    -- Additional context - JSONB is appropriate here
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Client info (optional, for security)
    ip_address INET,
    user_agent TEXT,
    request_id TEXT               -- For correlating with API logs
);

-- Indexes for common query patterns
CREATE INDEX idx_activity_org ON activity_logs(org_id);
CREATE INDEX idx_activity_logged_at ON activity_logs(logged_at);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_shop ON activity_logs(shop_id) WHERE shop_id IS NOT NULL;

-- Recent activity index (last 7 days queries are common)
CREATE INDEX idx_activity_recent ON activity_logs(org_id, logged_at DESC)
    WHERE logged_at > (NOW() - INTERVAL '7 days');

-- Note: For high-volume, consider partitioning by month
-- CREATE TABLE activity_logs_2026_01 PARTITION OF activity_logs 
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================================================
-- NOTIFICATION CONFIGS (What triggers alerts)
-- ============================================================================

CREATE TABLE notification_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    alert_type TEXT NOT NULL,     -- 'low_stock', 'payment_due', 'variance', 'attendance', etc.
    
    -- Trigger conditions (JSONB is appropriate - varies by alert type)
    -- Example: {"threshold": 10, "compare": "less_than", "entity": "stock_level"}
    conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Who gets notified
    notify_role_ids UUID[],       -- Array of role IDs
    notify_user_ids UUID[],       -- Specific users (optional)
    
    -- How (in_app is always included)
    send_email BOOLEAN DEFAULT false,
    
    -- Frequency limits
    cooldown_minutes INTEGER DEFAULT 60,  -- Don't repeat same alert within this period
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_config_org ON notification_configs(org_id);
CREATE INDEX idx_notif_config_type ON notification_configs(alert_type);
CREATE INDEX idx_notif_config_active ON notification_configs(is_active) WHERE is_active = true;

CREATE TRIGGER trg_notification_configs_updated_at 
    BEFORE UPDATE ON notification_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- NOTIFICATIONS (Actual notification instances)
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Target user
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity notification_severity DEFAULT 'info',
    
    -- Context
    shop_id UUID REFERENCES shops(id),
    entity_type TEXT,
    entity_id UUID,
    action_url TEXT,              -- Deep link: "/daily-closing/TRK/2026-01-23"
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    
    -- Expiry (optional)
    expires_at TIMESTAMPTZ,
    
    -- Source config
    config_id UUID REFERENCES notification_configs(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- HELPER: Log Activity
-- ============================================================================

CREATE OR REPLACE FUNCTION log_activity(
    p_org_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_entity_name TEXT DEFAULT NULL,
    p_shop_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
BEGIN
    -- Get user info
    SELECT 
        p.full_name,
        r.name
    INTO v_user_name, v_user_role
    FROM profiles p
    LEFT JOIN roles r ON p.role_id = r.id
    WHERE p.id = p_user_id;
    
    INSERT INTO activity_logs (
        org_id, user_id, user_name, user_role,
        action, entity_type, entity_id, entity_name,
        shop_id, changes, metadata
    ) VALUES (
        p_org_id, p_user_id, v_user_name, v_user_role,
        p_action, p_entity_type, p_entity_id, p_entity_name,
        p_shop_id, p_changes, p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER: Create Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
    p_org_id UUID,
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_severity notification_severity DEFAULT 'info',
    p_shop_id UUID DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_config_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notif_id UUID;
BEGIN
    INSERT INTO notifications (
        org_id, user_id, title, message, severity,
        shop_id, entity_type, entity_id, action_url,
        expires_at, config_id
    ) VALUES (
        p_org_id, p_user_id, p_title, p_message, p_severity,
        p_shop_id, p_entity_type, p_entity_id, p_action_url,
        p_expires_at, p_config_id
    )
    RETURNING id INTO v_notif_id;
    
    RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP: Delete expired notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE expires_at < NOW()
      OR (is_dismissed = true AND dismissed_at < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Unread Notification Count by User
-- ============================================================================

CREATE OR REPLACE VIEW v_notification_counts AS
SELECT 
    user_id,
    COUNT(*) AS total_unread,
    COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
    COUNT(*) FILTER (WHERE severity = 'warning') AS warning_count,
    COUNT(*) FILTER (WHERE severity = 'info') AS info_count
FROM notifications
WHERE is_read = false
  AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- ============================================================================
-- VIEW: Recent Activity (last 7 days)
-- ============================================================================

CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
    al.id,
    al.org_id,
    al.logged_at,
    al.user_name,
    al.user_role,
    aat.name AS action_name,
    aat.category AS action_category,
    al.entity_type,
    al.entity_id,
    al.entity_name,
    s.name AS shop_name,
    s.code AS shop_code,
    al.changes,
    al.metadata
FROM activity_logs al
JOIN activity_action_types aat ON al.action = aat.code
LEFT JOIN shops s ON al.shop_id = s.id
WHERE al.logged_at > (NOW() - INTERVAL '7 days')
ORDER BY al.logged_at DESC;

COMMENT ON TABLE activity_logs IS 
'Immutable audit trail. Every significant action is logged. changes and metadata are JSONB (appropriate for auxiliary archival data).';

COMMENT ON TABLE notifications IS 
'User notifications with read/dismiss tracking and optional expiry.';

COMMENT ON FUNCTION log_activity IS 
'Helper to create activity log entries with user context auto-populated.';
