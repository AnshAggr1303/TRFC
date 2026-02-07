# 🍳 TRFC - Multi-Shop Business Management System

> A comprehensive ERP solution for **The Rolling Foods Co.** - managing multiple food outlets with sales tracking, inventory management, HR/payroll, and double-entry accounting.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Database Schema](#-database-schema)
- [Architecture](#-architecture)
- [Implementation Status](#-implementation-status)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)

---

## 🎯 Overview

TRFC Business Management System is designed to handle:

- **4 Shops**: TRK (The Rolling Kitchen), TRS (The Rolling Shawarma), TFC (The Food Court Co.), TRJ (The Rolling Jaipur)
- **2 Storerooms**: Central inventory management with shop distribution
- **Daily Operations**: End-of-day closing wizard for sales, expenses, cash reconciliation, and inventory
- **Financial Integrity**: Double-entry bookkeeping with server-enforced ledger rules
- **HR & Payroll**: Attendance tracking, leave management, salary processing

### Core Design Principles

1. **Scalability First** - Nothing hardcoded, everything configurable via database
2. **Data Integrity** - Critical calculations (payroll, ledger) are server-side only
3. **Type Safety** - Auto-generated TypeScript types from database schema
4. **Offline-Capable** - PWA with optimistic updates

---

## ✨ Features

### Implemented ✅
- [x] Authentication & Authorization (Supabase Auth + RBAC)
- [x] Multi-shop architecture with RLS policies
- [x] Double-entry ledger system with `create_ledger_batch()` function
- [x] Daily Closing Wizard - Step 1: Shop & Date Selection
- [x] Dashboard layout with sidebar navigation

### In Progress 🚧
- [ ] Daily Closing Wizard - Step 2: Sales Entry
- [ ] Daily Closing Wizard - Step 3: Expenses
- [ ] Daily Closing Wizard - Step 4: Cash Reconciliation
- [ ] Daily Closing Wizard - Step 5: Inventory Count
- [ ] Daily Closing Wizard - Step 6: Review & Submit

### Planned 📅
- [ ] Inventory Management (Stock inward, transfers, wastage)
- [ ] Employee Management (CRUD, shift assignments)
- [ ] Payroll Processing (Server-side calculation)
- [ ] Attendance API Integration (eTimeOffice)
- [ ] Reports & Analytics Dashboard
- [ ] Settings Pages (Shops, Categories, Payment Methods)

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | SSR, Server Components |
| **UI** | Tailwind CSS + Shadcn/ui | Styling & Components |
| **State** | TanStack Query v5 | Server state management |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Backend** | Supabase (PostgreSQL) | Database, Auth, RLS |
| **Functions** | PostgreSQL Functions | Business logic enforcement |
| **Package Manager** | pnpm | Monorepo workspaces |

---

## 📁 Project Structure
```
TRFC/
├── backend/                    # Supabase & Database
│   ├── supabase/
│   │   ├── migrations/         # SQL migrations (10 files)
│   │   │   ├── 20240101000001_foundation.sql
│   │   │   ├── 20240101000002_financial.sql
│   │   │   ├── 20240101000003_inventory.sql
│   │   │   ├── 20240101000004_daily_operations.sql
│   │   │   ├── 20240101000005_hr_payroll.sql
│   │   │   ├── 20240101000006_system.sql
│   │   │   ├── 20240101000007_functions.sql
│   │   │   ├── 20240101000008_rls.sql
│   │   │   ├── 20240101000009_fixes.sql
│   │   │   └── 20240101000010_seed.sql
│   │   ├── functions/          # Edge Functions (Deno)
│   │   └── config.toml
│   └── package.json
│
├── frontend/                   # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/        # Login, forgot-password
│   │   │   ├── (dashboard)/   # Protected routes
│   │   │   │   ├── daily-closing/
│   │   │   │   ├── inventory/
│   │   │   │   ├── expenses/
│   │   │   │   ├── employees/
│   │   │   │   ├── payroll/
│   │   │   │   └── settings/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn components
│   │   │   ├── layout/        # Sidebar, Header
│   │   │   └── daily-closing/ # Wizard steps
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/
│   │   │   ├── supabase/      # Client & Server clients
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   ├── database.types.ts  # Auto-generated
│   │   │   ├── daily-closing.ts
│   │   │   └── index.ts
│   │   └── providers/
│   ├── public/
│   ├── .env.local.example
│   └── package.json
│
├── docs/                       # Documentation
├── .gitignore
├── package.json                # Root workspace config
├── pnpm-workspace.yaml
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase account (https://supabase.com)

### 1. Clone the Repository
```bash
git clone https://github.com/AnshAggr1303/TRFC.git
cd TRFC
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Supabase

#### Option A: Use Supabase Cloud (Recommended)
1. Create a new project at https://supabase.com
2. Go to SQL Editor and run all migration files in order (from `backend/supabase/migrations/`)
3. Copy your project URL and anon key from Settings → API

#### Option B: Local Supabase (Requires Docker)
```bash
cd backend
npx supabase start
npx supabase db reset  # Runs all migrations
```

### 4. Configure Environment
```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional, for admin operations
```

### 5. Generate TypeScript Types
```bash
# From root directory
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > frontend/src/types/database.types.ts
```

### 6. Create First User

1. Go to Supabase Dashboard → Authentication → Users → Add User
2. Create user with email/password
3. Run this SQL to create their profile:
```sql
INSERT INTO profiles (id, full_name, display_name, org_id, role_id, is_active)
SELECT 
  'YOUR-USER-UUID',
  'Your Name (Owner)',
  'Your Name',
  o.id,
  r.id,
  true
FROM organizations o
JOIN roles r ON r.org_id = o.id AND r.name = 'Owner'
WHERE o.code = 'TRFC';
```

### 7. Run Development Server
```bash
cd frontend
pnpm dev
```

Visit http://localhost:3000

---

## 🗄 Database Schema

### Core Tables (50+)

| Category | Tables |
|----------|--------|
| **Foundation** | organizations, shops, storerooms, profiles, roles |
| **Financial** | accounts, ledger_entries, payment_methods, vendors, expenses |
| **Inventory** | inventory_items, stock_levels, stock_movements, wastage_logs |
| **Daily Ops** | daily_sales_logs, sales_entries, daily_inventory_entries |
| **HR/Payroll** | employees, shifts, attendance_records, payroll_logs, salary_advances |
| **System** | activity_logs, notifications, notification_configs |

### Critical Server Functions

| Function | Purpose |
|----------|---------|
| `create_ledger_batch()` | Creates balanced double-entry ledger transactions |
| `record_stock_movement()` | Atomic inventory updates with balance tracking |
| `calculate_payroll()` | Server-side salary calculation |
| `process_daily_closing()` | Finalizes daily log and creates ledger entries |
| `get_opening_cash()` | Gets previous day's closing as today's opening |

### Enums
```typescript
account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
employment_type: 'monthly' | 'daily'
payment_status: 'paid' | 'partial' | 'pending'
payroll_status: 'draft' | 'finalized' | 'paid'
record_status: 'draft' | 'submitted' | 'verified' | 'locked'
```

---

## 🏗 Architecture

### Data Flow: Daily Closing
```
┌─────────────────────────────────────────────────────────────┐
│                    DAILY CLOSING WIZARD                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Shop & Date                                         │
│    └─→ Validates no existing log                             │
│    └─→ Fetches opening cash from previous day                │
│                                                              │
│  Step 2: Sales Entry                                         │
│    └─→ Enter amounts per payment method                      │
│    └─→ Auto-calculates: Gross, Returns, Net                  │
│                                                              │
│  Step 3: Expenses                                            │
│    └─→ Log petty cash expenses                               │
│    └─→ Categorize (Vegetables, Meat, etc.)                   │
│                                                              │
│  Step 4: Cash Reconciliation                                 │
│    └─→ Opening + Cash Sales - Cash Expenses = Expected       │
│    └─→ User enters Actual Closing                            │
│    └─→ Variance flagged if > ₹500                            │
│                                                              │
│  Step 5: Inventory Count                                     │
│    └─→ Count daily items (perishables)                       │
│    └─→ System calculates consumption                         │
│                                                              │
│  Step 6: Review & Submit                                     │
│    └─→ Server-side: process_daily_closing()                  │
│    └─→ Creates ledger entries atomically                     │
│    └─→ Locks record                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Model

| Type | Location | Example |
|------|----------|---------|
| 🔴 **Critical** | Server ONLY | Payroll, Ledger entries, Locked records |
| 🟡 **Validated** | Frontend → Server validates | Daily totals, Stock consumption |
| 🟢 **Offline-OK** | Frontend, synced later | Form subtotals, Draft entries |

---

## 📊 Implementation Status

### Phase 1: Foundation ✅
- [x] Database schema (10 migrations)
- [x] Supabase project setup
- [x] Next.js 14 project structure
- [x] Authentication flow
- [x] Dashboard layout
- [x] Type generation

### Phase 2: Daily Operations 🚧
- [x] Daily Closing - Step 1: Shop & Date
- [ ] Daily Closing - Step 2: Sales Entry
- [ ] Daily Closing - Step 3: Expenses
- [ ] Daily Closing - Step 4: Cash Reconciliation
- [ ] Daily Closing - Step 5: Inventory
- [ ] Daily Closing - Step 6: Review & Submit

### Phase 3: Inventory
- [ ] Stock Inward (Purchase from vendors)
- [ ] Stock Transfers (Storeroom → Shop)
- [ ] Wastage Logging
- [ ] Low Stock Alerts

### Phase 4: HR & Payroll
- [ ] Employee Management
- [ ] Shift Configuration
- [ ] Attendance API Integration
- [ ] Payroll Processing

### Phase 5: Reports & Settings
- [ ] P&L Reports
- [ ] Settings CRUD pages
- [ ] Data Export (Excel/PDF)

---

## 📡 API Reference

### Supabase Tables (via Supabase Client)
```typescript
// Example: Fetch shops
const { data: shops } = await supabase
  .from('shops')
  .select('id, name, code')
  .eq('is_active', true);

// Example: Create expense
const { data, error } = await supabase
  .from('expenses')
  .insert({
    org_id: orgId,
    shop_id: shopId,
    category_id: categoryId,
    description: 'Vegetables',
    amount: 500,
    expense_date: '2024-01-23'
  });
```

### Server Functions (via RPC)
```typescript
// Create ledger batch
const { data: batchId } = await supabase.rpc('create_ledger_batch', {
  p_org_id: orgId,
  p_shop_id: shopId,
  p_entry_date: '2024-01-23',
  p_source_type: 'daily_closing',
  p_source_id: dailyLogId,
  p_entries: [
    { account_id: cashAccountId, debit: 5000, credit: 0 },
    { account_id: salesAccountId, debit: 0, credit: 5000 }
  ]
});

// Calculate payroll
const { data: payrollId } = await supabase.rpc('calculate_payroll', {
  p_employee_id: employeeId,
  p_period_start: '2024-01-01',
  p_period_end: '2024-01-31'
});
```

---

## 👥 Contributing

### Branch Naming

- `feature/daily-closing-step-2` - New features
- `fix/login-redirect` - Bug fixes
- `refactor/hooks-cleanup` - Code improvements

### Commit Messages
```
feat: add sales entry step to daily closing wizard
fix: resolve TypeScript errors in use-shops hook
docs: update README with API reference
```

### Development Workflow

1. Pull latest `main`
2. Create feature branch
3. Make changes
4. Test locally
5. Push and create PR

---

## 📄 License

Private - The Rolling Foods Co.

---

## 📞 Support

For questions or issues, contact the development team.