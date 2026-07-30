# Samabaya Samiti — Full Development Plan

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite + TypeScript | Fast dev, static build |
| Styling | TailwindCSS | Utility-first, rapid UI |
| State | Zustand | Lightweight UI state (form drafts, filters) |
| Forms | react-hook-form + zod | Validated financial inputs |
| Routing | React Router v6 | SPA routing with guards |
| Backend | Supabase (Postgres + Auth + RLS + Storage) | Zero server management |
| PDF | @react-pdf/renderer or pdf-lib | Client-side, no extra service |
| Hosting (FE) | Your VPS + Nginx | $0 extra (already paying) |
| Hosting (BE) | Supabase Free tier | $0 |
| Keep-alive | Cron on VPS → REST ping | Prevents 7-day pause |

---

## Terminology Convention

| Term | Meaning |
|------|---------|
| **Profit** | Used instead of "interest" everywhere — loan profit, savings profit, etc. |
| **Profit Rate** | The rate at which profit is charged on loans (was "interest rate") |
| **Profit Method** | Flat Rate or Reducing Balance (was "interest method") |
| **Profit Distribution** | Admin-triggered release of accumulated profit to members |
| **Journal Entry** | Double-entry record for income/expense/asset/liability accounts |
| **Exit** | Member leaves the samiti; settlement is calculated and paid out |

---

## Full Data Model (All Tables)

### samiti_settings
```sql
CREATE TABLE samiti_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_name TEXT NOT NULL,
  samiti_code TEXT UNIQUE NOT NULL,
  shares_enabled BOOLEAN NOT NULL DEFAULT false,
  share_value DECIMAL(12,2) DEFAULT 0,
  default_profit_method TEXT CHECK (default_profit_method IN ('flat', 'reducing_balance')) DEFAULT 'reducing_balance',
  default_profit_rate DECIMAL(5,2) DEFAULT 12.00,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE samiti_settings ENABLE ROW LEVEL SECURITY;
```

### members
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  member_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  guardian_name TEXT,
  nid TEXT,
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('active', 'inactive', 'exited')) DEFAULT 'active',
  exit_date DATE,
  exit_settlement_amount DECIMAL(12,2),
  exit_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
```

### savings_accounts
```sql
CREATE TABLE savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  member_id UUID NOT NULL REFERENCES members(id),
  account_type TEXT CHECK (account_type IN ('general', 'recurring', 'fixed_deposit')) DEFAULT 'general',
  account_number TEXT UNIQUE NOT NULL,
  opened_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
```

### savings_transactions
```sql
CREATE TABLE savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  savings_account_id UUID NOT NULL REFERENCES savings_accounts(id),
  transaction_type TEXT CHECK (transaction_type IN ('deposit', 'withdrawal', 'profit', 'correction', 'exit_settlement')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference TEXT,
  reason_note TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
```

### loans
```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  member_id UUID NOT NULL REFERENCES members(id),
  loan_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purpose TEXT,
  tenure_months INT NOT NULL,
  profit_method TEXT CHECK (profit_method IN ('flat', 'reducing_balance')) NOT NULL,
  profit_rate DECIMAL(5,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'closed')) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
```

### loan_emi_schedule
```sql
CREATE TABLE loan_emi_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL,
  profit_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'paid', 'partial', 'overdue')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE loan_emi_schedule ENABLE ROW LEVEL SECURITY;
```

### chart_of_accounts (NEW)
```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('income', 'expense', 'asset', 'liability', 'equity')) NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(samiti_id, account_code)
);
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Seed system accounts for every samiti (created via trigger or manual insert):
-- Income: 4001 Loan Profit Income, 4002 Savings Profit Income, 4003 Other Income
-- Expense: 5001 Operating Expense, 5002 Administrative Expense
-- Asset: 1001 Cash & Bank, 1002 Loans Receivable
-- Liability: 2001 Member Savings, 2002 Profit Payable
-- Equity: 3001 Retained Earnings
```

### journal_entries (NEW)
```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  entry_number TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  entry_type TEXT CHECK (entry_type IN ('loan_disbursement', 'loan_repayment', 'deposit', 'withdrawal', 'profit_posting', 'profit_distribution', 'expense', 'income', 'exit_settlement', 'correction')) NOT NULL,
  reference_id UUID,         -- links to originating transaction/loan etc.
  reference_table TEXT,
  total_debit DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (debit_amount >= 0 AND credit_amount >= 0),
  CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
```

### profit_distributions (NEW)
```sql
CREATE TABLE profit_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  distribution_number TEXT UNIQUE NOT NULL,
  distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_profit_amount DECIMAL(12,2) NOT NULL,
  distribution_basis TEXT CHECK (distribution_basis IN ('share', 'savings', 'equal')) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'distributed')) DEFAULT 'draft',
  notes TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;

CREATE TABLE profit_distribution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_distribution_id UUID NOT NULL REFERENCES profit_distributions(id),
  member_id UUID NOT NULL REFERENCES members(id),
  basis_amount DECIMAL(12,2) NOT NULL,    -- shares held / avg savings / 1 for equal
  distribution_amount DECIMAL(12,2) NOT NULL,
  savings_transaction_id UUID REFERENCES savings_transactions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profit_distribution_items ENABLE ROW LEVEL SECURITY;
```

### audit_log
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID REFERENCES samiti_settings(id),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

---

## Project Folder Structure

```
samabaya-samiti/
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── supabase/
│   ├── migrations/
│   │   ├── 001_samiti_settings.sql
│   │   ├── 002_members.sql
│   │   ├── 003_savings.sql
│   │   ├── 004_loans.sql
│   │   ├── 005_chart_of_accounts.sql
│   │   ├── 006_journal_entries.sql
│   │   ├── 007_profit_distributions.sql
│   │   ├── 008_audit_log.sql
│   │   ├── 009_rls_policies.sql
│   │   └── 010_seed_data.sql
│   └── seed.sql
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── vite-env.d.ts
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── supabase-admin.ts
│   │   ├── utils.ts
│   │   ├── profit.ts              # Flat Rate & Reducing Balance calc
│   │   └── accounting.ts          # Double-entry helpers, P&L calc
│   ├── types/
│   │   ├── database.ts
│   │   ├── samiti.ts
│   │   ├── savings.ts
│   │   ├── loan.ts
│   │   ├── accounting.ts          # ChartOfAccounts, JournalEntry, etc.
│   │   └── profit.ts              # ProfitDistribution types
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProfile.ts
│   │   ├── useMembers.ts
│   │   ├── useSavings.ts
│   │   ├── useLoans.ts
│   │   ├── useReports.ts
│   │   ├── useSamitiConfig.ts
│   │   ├── useAccounting.ts       # Accounts, journal queries
│   │   ├── useProfitDistribution.ts
│   │   └── useMemberExit.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── formStore.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RoleBadge.tsx
│   │   ├── members/
│   │   │   ├── MemberList.tsx
│   │   │   ├── MemberCard.tsx
│   │   │   ├── MemberForm.tsx
│   │   │   ├── MemberProfile.tsx
│   │   │   └── MemberExitForm.tsx      # Exit wizard
│   │   ├── savings/
│   │   │   ├── SavingsOverview.tsx
│   │   │   ├── DepositForm.tsx
│   │   │   ├── WithdrawForm.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   └── PassbookPDF.tsx
│   │   ├── loans/
│   │   │   ├── LoanApplicationForm.tsx
│   │   │   ├── LoanList.tsx
│   │   │   ├── LoanDetail.tsx
│   │   │   ├── EMIChart.tsx
│   │   │   ├── ApprovalWorkflow.tsx
│   │   │   └── RepaymentForm.tsx
│   │   ├── shares/
│   │   │   ├── ShareOverview.tsx
│   │   │   └── ShareForm.tsx
│   │   ├── accounting/                  # NEW — full module
│   │   │   ├── ChartOfAccountsList.tsx
│   │   │   ├── AccountForm.tsx
│   │   │   ├── JournalEntryList.tsx
│   │   │   ├── JournalEntryForm.tsx     # Manual entry (Admin only)
│   │   │   └── ProfitDistributionWizard.tsx
│   │   ├── reports/
│   │   │   ├── DailyCashSummary.tsx
│   │   │   ├── LoanRegister.tsx
│   │   │   ├── MemberLedger.tsx
│   │   │   ├── OverdueList.tsx
│   │   │   ├── SocietySummary.tsx
│   │   │   ├── ProfitAndLoss.tsx        # NEW
│   │   │   ├── ProfitDistributionReport.tsx  # NEW
│   │   │   └── ReportExport.tsx
│   │   ├── admin/
│   │   │   ├── UserManagement.tsx
│   │   │   ├── SamitiConfig.tsx
│   │   │   ├── AuditLog.tsx
│   │   │   └── ProfitConfig.tsx         # was InterestConfig
│   │   └── super-admin/
│   │       ├── TenantProvision.tsx
│   │       ├── SystemAuditLog.tsx
│   │       └── BackupPanel.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── MembersPage.tsx
│   │   ├── MemberDetailPage.tsx
│   │   ├── SavingsPage.tsx
│   │   ├── LoansPage.tsx
│   │   ├── LoanDetailPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── AccountingPage.tsx           # NEW
│   │   ├── ProfitDistributionPage.tsx   # NEW
│   │   ├── AdminSettingsPage.tsx
│   │   ├── SuperAdminPage.tsx
│   │   ├── PassbookPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── routes/
│   │   └── index.tsx
│   ├── lib/
│   │   ├── pdf.ts
│   │   ├── profit.ts
│   │   ├── accounting.ts
│   │   └── export.ts
│   └── config/
│       ├── constants.ts
│       └── navigation.ts
└── scripts/
    ├── warmup.js
    └── seed-local.sh
```

---

## Phase 1 — Supabase Setup (Day 1)

### Step 1.1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a strong database password
3. Region: closest to your VPS
4. Wait ~2 minutes

### Step 1.2: Install Supabase CLI (optional)
```bash
winget install supabase.cli
npm install -g supabase
supabase login
supabase init
supabase start
```

### Step 1.3: Database Schema
Go to **SQL Editor** → run SQL files from `supabase/migrations/` in order (full SQL provided above in the Data Model section).

### Step 1.4: Seed System Chart of Accounts
```sql
-- Insert default accounts (run once per samiti)
INSERT INTO chart_of_accounts (samiti_id, account_code, account_name, account_type, is_system) VALUES
  ('<samiti-uuid>', '1001', 'Cash & Bank', 'asset', true),
  ('<samiti-uuid>', '1002', 'Loans Receivable', 'asset', true),
  ('<samiti-uuid>', '2001', 'Member Savings', 'liability', true),
  ('<samiti-uuid>', '2002', 'Profit Payable', 'liability', true),
  ('<samiti-uuid>', '3001', 'Retained Earnings', 'equity', true),
  ('<samiti-uuid>', '4001', 'Loan Profit Income', 'income', true),
  ('<samiti-uuid>', '4002', 'Savings Profit Income', 'income', true),
  ('<samiti-uuid>', '4003', 'Other Income', 'income', true),
  ('<samiti-uuid>', '5001', 'Operating Expense', 'expense', true),
  ('<samiti-uuid>', '5002', 'Administrative Expense', 'expense', true);
```

### Step 1.5: Create Auth Users
- `superadmin@samiti.test` — role: `super_admin`
- `admin@samiti.test` — role: `society_admin`
- `manager@samiti.test` — role: `manager`
- `member@samiti.test` — role: `member`

### Step 1.6: Get API Keys
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret, never in frontend)

---

## Phase 2 — Frontend Scaffold (Days 2-3)

### Step 2.1: Create Project
```bash
npm create vite@latest samabaya-samiti -- --template react-ts
cd samabaya-samiti
npm install @supabase/supabase-js react-router-dom zustand
npm install react-hook-form @hookform/resolvers zod
npm install tailwindcss @tailwindcss/vite
npm install @react-pdf/renderer date-fns lucide-react
npm run dev
```

### Step 2.2: Configure Tailwind
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```
```css
/* src/index.css */
@import "tailwindcss";
```

### Step 2.3: Supabase Client
```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 2.4: Auth Hook + Route Guards
(Same as standard pattern — email/password login via `supabase.auth.signInWithPassword()`, redirect by role)

### Step 2.5: Routes
```
/login                          → LoginPage
/dashboard                      → DashboardPage (all roles)
/members                        → MembersPage (Manager+)
/members/:id                    → MemberDetailPage (Manager+)
/savings                        → SavingsPage (Manager+)
/loans                          → LoansPage (all roles)
/loans/:id                      → LoanDetailPage (all roles)
/accounting                     → AccountingPage (Admin+)        NEW
/profit-distribution            → ProfitDistributionPage (Admin+) NEW
/reports                        → ReportsPage (Manager+)
/admin                          → AdminSettingsPage (Admin+)
/super-admin                    → SuperAdminPage (Super Admin)
```

---

## Phase 3 — Build Modules (Ordered by Dependency)

### Step 3.1: Auth UI
- Login page, session persistence, role-based redirect

### Step 3.2: Layout
- Sidebar with per-role nav items
- Nav includes: Dashboard, Members, Savings, Loans, **Accounts**, **Profit Distribution**, Reports, Settings

### Step 3.3: Dashboard
- **Member**: savings balance, loan status, recent transactions
- **Manager**: today's cash summary, overdue count
- **Admin**: total savings, loans outstanding, member count, **undistributed profit**
- **Super Admin**: system-wide stats

### Step 3.4: Members Module
- CRUD with search/filter, member profile with tabs
- **NEW: Member Exit Tab** — shows settlement calculation, triggers exit workflow

### Step 3.5: Exit System (NEW)
- **Member status flow**: `active` → `exited`
- Exit criteria check:
  - All loans must be closed (zero outstanding)
  - Settlement = savings balance + share capital (if enabled) - any dues
- `MemberExitForm.tsx` — wizard:
  1. Check outstanding loans (block exit if any remain)
  2. Calculate settlement amount: savings balance + share value × shares held
  3. Deduct any penalties if configured in samiti_settings
  4. Record exit with date, settlement amount, reason note
  5. On confirm: create `exit_settlement` savings_transaction, mark member as `exited`
  6. Auto-generate journal entry: Dr Member Savings (liability) / Cr Cash & Bank (asset)
- **Reports**: Exited members list, exit settlements summary

### Step 3.6: Savings Module
- Deposit/Withdrawal with auto-calculated running balance
- Transaction types include: `deposit`, `withdrawal`, `profit`, `correction`, `exit_settlement`
- Passbook PDF export
- **Journal integration**: every deposit/withdrawal posts a double-entry line

### Step 3.7: Loan Module
- Application → Approval → Disbursement → EMI schedule → Repayment
- Profit calculation (instead of "interest"):
  ```ts
  // src/lib/profit.ts
  export function flatRateEMI(principal: number, rate: number, tenure: number) {
    const totalProfit = principal * (rate / 100) * (tenure / 12)
    const totalAmount = principal + totalProfit
    return totalAmount / tenure
  }

  export function reducingBalanceEMI(principal: number, rate: number, tenure: number) {
    const monthlyRate = rate / 12 / 100
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)
                  / (Math.pow(1 + monthlyRate, tenure) - 1)
    return emi
  }
  ```
- On disbursement:
  - Generate EMI schedule with `profit_amount` per installment
  - Post journal entry: Dr Loans Receivable / Cr Cash & Bank
- On repayment:
  - Split EMI into principal portion + profit portion
  - Post journal entry: Dr Cash & Bank / Cr Loans Receivable (principal part), Cr Loan Profit Income (profit part)

### Step 3.8: Share Module
- Toggled by `samiti_settings.shares_enabled`
- Used as basis for profit distribution when `distribution_basis = 'share'`

### Step 3.9: Accounting Module (NEW)
This is the core new module. It provides double-entry bookkeeping behind every financial transaction and allows manual income/expense entry.

**Chart of Accounts Management**:
- `ChartOfAccountsList.tsx` — tree/table view of all accounts
- `AccountForm.tsx` — create/edit account (income, expense, asset, liability, equity)
- System accounts (4001, 5001, etc.) are `is_system = true` and cannot be deleted

**Journal Entry**:
- **Automatic** — every financial operation (loan disbursement, repayment, deposit, withdrawal, profit posting, exit) posts double-entry lines behind the scenes
- **Manual** — Admin can create manual journal entries for expenses/income not covered by automation
- `JournalEntryForm.tsx` — pick account, enter debit/credit, description
- Validation: debits must equal credits
- `JournalEntryList.tsx` — searchable, filterable by date range, account, entry type

**Profit Posting**:
- At end of period (monthly/quarterly), Admin reviews accumulated Loan Profit Income (4001)
- Can post adjusting entries for other income/expenses

**Profit & Loss Report**:
- `ProfitAndLoss.tsx` — date-range report
- Income section: Loan Profit Income, Savings Profit Income, Other Income
- Expense section: Operating Expense, Administrative Expense
- Net Profit/Loss calculation

### Step 3.10: Profit Distribution System (NEW)
This allows Admin to distribute accumulated profits to members.

**Distribution Basis Options**:
1. **Share-based** — profit divided proportionally by shares held (requires `shares_enabled = true`)
2. **Savings-based** — profit divided proportionally by average savings balance over the period
3. **Equal** — equal share to every active member

**Workflow** (`ProfitDistributionWizard.tsx`):
1. Admin clicks "New Distribution"
2. Selects period (e.g., "July 2026")
3. System calculates total available profit: sum of Loan Profit Income (4001) - Expenses (5000s) = Net Profit
4. Admin chooses distribution basis (share/savings/equal)
5. System calculates per-member amounts and shows preview table
6. Admin can adjust individual amounts if needed
7. On confirm:
   - Creates `profit_distributions` record
   - Creates `profit_distribution_items` for each member
   - For each member: posts `profit` savings_transaction to their savings account
   - Posts journal entry: Dr Profit Payable (2002) / Cr Member Savings (2001) for each member
   - Updates Retained Earnings (3001)

**UI**: Profit distribution history list, ability to view past distributions, PDF report export

### Step 3.11: Reports
- `DailyCashSummary.tsx` — aggregate today's transactions
- `LoanRegister.tsx` — all loans with status + outstanding
- `OverdueList.tsx` — overdue EMIs
- `SocietySummary.tsx` — totals query
- **`ProfitAndLoss.tsx` (NEW)** — income/expense/profit over date range
- **`ProfitDistributionReport.tsx` (NEW)** — per-distribution detail, per-member totals
- Export: CSV, PDF

### Step 3.12: Admin Settings
- `SamitiConfig.tsx` — samiti name, address, shares toggle, share value
- **`ProfitConfig.tsx` (renamed)** — default profit method + rate for loans
- `UserManagement.tsx` — manage users
- `AuditLog.tsx` — read-only log

### Step 3.13: Super Admin
- `TenantProvision.tsx` — create new samiti
- `SystemAuditLog.tsx` — cross-samiti log
- `BackupPanel.tsx` — backup management

---

## Phase 4 — Double-Entry Accounting Integration

Every financial event must post journal entries. Here's the mapping:

| Event | Debit | Credit |
|-------|-------|--------|
| Member Deposit | Cash & Bank | Member Savings |
| Member Withdrawal | Member Savings | Cash & Bank |
| Loan Disbursement | Loans Receivable | Cash & Bank |
| EMI Repayment (Principal part) | Cash & Bank | Loans Receivable |
| EMI Repayment (Profit part) | Cash & Bank | Loan Profit Income |
| Profit Distribution | Profit Payable | Member Savings |
| Expense (Manual) | (Expense Account) | Cash & Bank |
| Member Exit Settlement | Member Savings | Cash & Bank |

Implementation in `src/lib/accounting.ts`:
```ts
export async function postJournalEntry(params: {
  supabase: SupabaseClient
  samitiId: string
  entryType: string
  description: string
  referenceId?: string
  referenceTable?: string
  lines: { accountCode: string; debit: number; credit: number; description?: string }[]
  performedBy: string
}) {
  const { data, error } = await supabase.rpc('post_journal_entry', params)
  return { data, error }
}
```

Better: create a Postgres function `post_journal_entry` that handles the insert in a transaction:
```sql
CREATE OR REPLACE FUNCTION post_journal_entry(
  p_samiti_id UUID,
  p_entry_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_table TEXT DEFAULT NULL,
  p_lines JSONB,  -- [{account_code, debit, credit, description}]
  p_performed_by UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_id UUID;
  v_total_debit DECIMAL(12,2) := 0;
  v_total_credit DECIMAL(12,2) := 0;
  v_entry_number TEXT;
  v_line JSONB;
BEGIN
  -- Validate totals match
  SELECT SUM((l->>'debit')::DECIMAL), SUM((l->>'credit')::DECIMAL))
    INTO v_total_debit, v_total_credit
    FROM jsonb_array_elements(p_lines) AS l;
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Debit (% ) and credit (% ) must match', v_total_debit, v_total_credit;
  END IF;

  -- Generate entry number
  v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD-') || LPAD(nextval('entry_number_seq')::TEXT, 4, '0');

  -- Insert journal entry
  INSERT INTO journal_entries (samiti_id, entry_number, entry_type, description, reference_id, reference_table, total_debit, total_credit, performed_by)
  VALUES (p_samiti_id, v_entry_number, p_entry_type, p_description, p_reference_id, p_reference_table, v_total_debit, v_total_credit, p_performed_by)
  RETURNING id INTO v_entry_id;

  -- Insert lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
    SELECT v_entry_id, ca.id, (v_line->>'debit')::DECIMAL, (v_line->>'credit')::DECIMAL, v_line->>'description'
    FROM chart_of_accounts ca
    WHERE ca.samiti_id = p_samiti_id AND ca.account_code = v_line->>'account_code';
  END LOOP;

  RETURN v_entry_id;
END;
$$;
```

---

## Phase 5 — RLS Policies

### Key policies:
- **chart_of_accounts**: Admin+ can CRUD; Manager can SELECT
- **journal_entries + lines**: Admin+ can SELECT/INSERT; Manager SELECT only
- **profit_distributions + items**: Admin+ only
- **members**: `exited` members are still visible (read-only) for historical reporting

### add_rls_policies.sql additions:
```sql
-- Accounting tables
CREATE POLICY admin_accounting ON journal_entries
  FOR ALL USING (
    auth.user_role() IN ('society_admin')
    AND auth.user_samiti_id() = samiti_id
  );

CREATE POLICY manager_view_accounting ON journal_entries
  FOR SELECT USING (
    auth.user_role() = 'manager'
    AND auth.user_samiti_id() = samiti_id
  );

CREATE POLICY super_admin_accounting ON journal_entries
  FOR ALL USING (auth.user_role() = 'super_admin');
```

---

## Phase 6 — Testing

### Manual Testing Checklist (Updated)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Member login | Login as member | See own dashboard, balance, loans |
| Manager deposit | Record deposit | Balance updates, journal entry created |
| Manager withdrawal | Record withdrawal | Balance decreases, journal entry created |
| Loan application | Submit as member | Appears in Admin's pending list |
| Loan approval | Admin approves | Status changes to approved |
| Loan disbursement | Admin disburses | EMI schedule generated, journal entry posted |
| EMI repayment | Record repayment | EMI marked paid, profit portion goes to Loan Profit Income |
| Profit & Loss report | Run report | Shows income from loan profit, totals match |
| Chart of accounts | Admin creates new expense account | Account appears in journal entry dropdown |
| Manual journal entry | Admin records an expense | Debit/credit balance, reflects in P&L |
| Profit distribution share-based | Admin distributes by shares | Each member gets profit proportional to shares |
| Profit distribution savings-based | Admin distributes by savings | Each member gets profit proportional to avg savings |
| Profit credit to member | After distribution | Member sees profit credit in savings transactions |
| Member exit — loans open | Try to exit member with active loans | Blocked with error message |
| Member exit — clean | Exit member with no loans | Settlement calculated, posted to savings, member status = exited |
| Exit journal entry | Check journal after exit | Dr Member Savings, Cr Cash & Bank |
| Share toggle off | Admin disables shares | Share tab hidden, profit distribution cannot use share basis |

---

## Phase 7 — Production Deployment

### Step 7.1: Build
```bash
npm run build  # -> dist/
```

### Step 7.2: Deploy to VPS
```bash
scp -r dist/* user@your-vps:/var/www/samabaya-samiti/
```

Or GitHub Action (see previous version).

### Step 7.3: Nginx Config
```nginx
server {
    listen 80;
    server_name samiti.yourdomain.com;
    root /var/www/samabaya-samiti;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/samabaya-samiti /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d samiti.yourdomain.com
```

### Step 7.4: Supabase Production Check
- Enforce SSL
- Disable email confirmation (if handling user creation via Admin)
- Set up pg_dump cron for backups

### Step 7.5: Keep-Alive Cron
```bash
# crontab -e — every 3 days
0 6 */3 * * curl -s "https://[PROJECT-REF].supabase.co/rest/v1/rpc/heartbeat" -H "apikey: [YOUR_ANON_KEY]"
```

---

## Phase 8 — Post-Launch

### Monitoring
- Sentry or PostHog for errors
- Monitor Supabase database size

### When to Upgrade to Supabase Pro ($25/mo)
- Database exceeds 500MB
- Need daily automated backups
- More than 50,000 MAU

### Future Features (Phase 2)
- SMS/email notifications
- Multi-branch federation reporting
- Document management
- Government e-return integration

---

## Navigation Menu Per Role

| Menu Item | Member | Manager | Society Admin | Super Admin |
|-----------|--------|---------|---------------|-------------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Members | — | ✓ | ✓ | — |
| Savings | self | ✓ | ✓ | — |
| Loans | self | ✓ | ✓ | — |
| Accounts | — | view only | ✓ | — |
| Profit Distribution | — | — | ✓ | — |
| Reports | passbook only | ✓ | ✓ | — |
| Admin Settings | — | — | ✓ | — |
| Super Admin | — | — | — | ✓ |

---

## Summary Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Supabase Setup | 1 day | Database, Auth, RLS, API keys |
| Phase 2: Frontend Scaffold | 2 days | Vite + routing + auth + layout |
| Phase 3: Build Modules | 3-4 weeks | Members, Savings, Loans, Shares, **Accounts**, **Profit Distribution**, **Exit**, Reports |
| Phase 4: Accounting Integration | 3 days | Auto-posting journal entries for all financial events |
| Phase 5: RLS & Integrity | 2 days | Policies, triggers, audit |
| Phase 6: Testing | 3 days | Full manual + RLS verification |
| Phase 7: Deployment | 1 day | VPS deploy, Nginx, SSL, cron |
| **Total** | **~5-6 weeks** | **Production-ready v1 with full accounting** |
