# TRFC Backend

Supabase backend for the TRFC Business Management System.

## 🚀 Getting Started

```bash
# Install Supabase CLI
npm install

# Start local Supabase (requires Docker)
npm run start

# Run all migrations
npm run db:reset

# Generate TypeScript types for frontend
npm run typegen
```

## 📁 Structure

```
backend/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── migrations/              # SQL files (run in order)
│   │   ├── 20240101000001_foundation.sql    # Extensions, enums, orgs, shops, roles
│   │   ├── 20240101000002_financial.sql     # Accounts, ledger, vendors
│   │   ├── 20240101000003_inventory.sql     # Items, stock_levels, movements
│   │   ├── 20240101000004_daily_operations.sql  # Daily sales, expenses
│   │   ├── 20240101000005_hr_payroll.sql    # Employees, attendance, payroll
│   │   ├── 20240101000006_system.sql        # Activity logs, notifications
│   │   ├── 20240101000007_functions.sql     # Business logic functions
│   │   ├── 20240101000008_rls.sql           # Row-level security
│   │   ├── 20240101000009_fixes.sql         # Missing tables patch
│   │   └── 20240101000010_seed.sql          # Initial TRFC data
│   └── functions/               # Edge Functions
└── scripts/                     # Utility scripts
```

## 🔒 Critical Server Functions

These functions enforce business rules at the database level:

### `create_ledger_batch()`
**The ONLY way to write to ledger.** Validates `SUM(debit) = SUM(credit)`.

```sql
SELECT create_ledger_batch(
  'org-id'::uuid,
  '2026-01-23'::date,
  'daily_sales',
  'log-id'::uuid,
  'shop-id'::uuid,
  '[
    {"account_id": "cash-id", "debit": 1000, "credit": 0},
    {"account_id": "sales-id", "debit": 0, "credit": 1000}
  ]'::jsonb
);
```

### `record_stock_movement()`
**The ONLY way to change stock.** Atomic update to `stock_levels` + audit trail.

```sql
SELECT record_stock_movement(
  'org-id'::uuid,
  'item-id'::uuid,
  'storeroom-id'::uuid,
  NULL,
  'purchase',
  '2026-01-23'::date,
  10.5,   -- quantity
  150.00  -- cost per unit
);
```

### `calculate_payroll()`
**Server-side payroll calculation.** Cannot be bypassed by frontend.

## 📊 Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FOUNDATION                              │
│  organizations → shops, storerooms, roles, profiles             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   FINANCIAL   │    │   INVENTORY   │    │   HR/PAYROLL  │
│ accounts      │    │ items         │    │ employees     │
│ ledger_entries│    │ stock_levels  │    │ attendance    │
│ vendors       │    │ stock_moves   │    │ payroll_logs  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY OPERATIONS                            │
│  daily_sales_logs → sales_entries, expenses, inventory_entries  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Row-Level Security

All tables use RLS with these helper functions:

| Function | Purpose |
|----------|---------|
| `auth.user_org_id()` | Get current user's organization |
| `auth.is_owner()` | Check if user has Owner role |
| `auth.has_permission(p)` | Check specific permission |
| `auth.can_access_shop(id)` | Check shop access |

## 🌱 Seed Data

After running migrations, you'll have:

- **Organization**: The Rolling Foods Co. (TRFC)
- **Shops**: TRK (Kota), TRS (Sikar), TFC (Churu), TRJ (Jaipur)
- **Storerooms**: Main Area (serves TRK, TRS, TFC), Jaipur (serves TRJ)
- **Roles**: Owner, Manager, Cashier, Storekeeper, Viewer
- **Chart of Accounts**: Assets, Liabilities, Equity, Revenue, Expenses
- **Payment Methods**: Cash, UPI, Card, Swiggy (20%), Zomato (20%), Credit

## 🧪 Testing Queries

```sql
-- Verify ledger is balanced
SELECT SUM(debit) - SUM(credit) as balance FROM ledger_entries;
-- Should return 0

-- Check organization exists
SELECT * FROM organizations;

-- List all shops
SELECT code, name, city FROM shops;

-- View chart of accounts
SELECT code, name, account_type FROM accounts ORDER BY code;
```
