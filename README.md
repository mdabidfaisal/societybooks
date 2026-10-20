# SocietyBooks — Cooperative Management System

A full-stack cooperative (samiti) management system built with React, TypeScript, and Supabase. Supports member management, savings accounts, loans with EMI schedules, double-entry accounting, profit distribution, and role-based access control.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| **State** | Zustand 5 (UI/form state), React hooks (data fetching) |
| **Forms** | React Hook Form 7 + Zod 3 schema validation |
| **Routing** | React Router 7 with role-protected routes |
| **Backend** | Supabase (PostgreSQL, Auth, REST API, RLS) |
| **PDF** | @react-pdf/renderer 4 |
| **Linting** | Oxlint 1 |
| **Auth** | Supabase Auth (GoTrue) with email/password |
| **Database** | PostgreSQL 15+ with Row-Level Security |

## Architecture

```
┌─────────────────────────────────────────────┐
│                React SPA (Vite)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Pages   │ │  Hooks   │ │  Components   │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │            │              │          │
│  ┌────▼────────────▼──────────────▼───────┐  │
│  │            Lib / API Layer              │  │
│  │  supabase.ts (anon)  supabase-admin.ts  │  │
│  │  accounting.ts  profit.ts  export.ts    │  │
│  └────────────────┬────────────────────────┘  │
└───────────────────┼───────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │     Supabase        │
         │  ┌──────┐ ┌──────┐ │
         │  │ Auth │ │ REST │ │
         │  │GoTrue│ │ API  │ │
         │  └──┬───┘ └──┬───┘ │
         │     └──┬─────┘     │
         │  ┌─────▼──────┐   │
         │  │ PostgreSQL │   │
         │  │  + RLS     │   │
         │  └────────────┘   │
         └───────────────────┘
```

### Two Supabase Clients

| Client | Key | Purpose |
|---|---|---|
| `supabase` (anon) | `VITE_SUPABASE_ANON_KEY` | Login, member-facing queries, RLS-gated operations |
| `supabaseAdmin` (service_role) | `VITE_SUPABASE_SERVICE_ROLE_KEY` | Admin user CRUD (create/update/delete users) |

## Roles & Permissions

| Role | Scope | Permissions |
|---|---|---|
| `super_admin` | System-wide | Manage all samitis, create society_admins, audit log |
| `society_admin` | Per-samiti | Manage members, managers, settings, accounting, profit distribution |
| `manager` | Per-samiti | Manage members, savings, loans, reports |
| `member` | Self-only | View own passbook, savings, loans, apply for loans |

## Database Schema

### Tables (14 tables in `public` schema)

```
samiti_settings       → Cooperative/samiti configuration
members               → Member profiles (with college, bank, nominee fields)
savings_accounts      → Savings accounts per member (general/recurring/fixed_deposit)
savings_transactions  → Deposit/withdrawal/profit/exit transactions (financial — delete protected)
loans                 → Loan applications with profit method/rate
loan_emi_schedule     → EMI installments generated on disbursement
loan_transactions     → Loan repayment transactions
chart_of_accounts     → Double-entry accounting chart (income/expense/asset/liability/equity)
journal_entries       → Journal entry headers (financial — delete protected)
journal_entry_lines   → Journal entry lines (debit/credit per account) (financial — delete protected)
profit_distributions  → Profit distribution runs
profit_distribution_items → Per-member profit allocation
audit_log             → Audit trail (RLS: society_admin/super_admin only)
system_account_mappings → Customizable account code mappings per transaction type
```

### Key Constraints

- Financial tables (`savings_transactions`, `journal_entries`, `journal_entry_lines`) have `BEFORE DELETE` triggers that **prevent hard deletion**
- `journal_entry_lines` enforces each line is either debit OR credit (not both) via CHECK constraint
- Loans cascade to EMI schedules on creation (app-generated, not DB-level cascade)

## Authentication & Authorization

### Login Flow

```
1. User submits email + password → supabase.auth.signInWithPassword()
2. Supabase Auth validates against auth.users
3. On success, app checks:
   a. super_admin bypasses all checks
   b. society_admin/manager → samiti_settings.is_active must be true
   c. member → members.status must be 'active'
4. If checks pass → redirect to /dashboard or /super-admin
5. If deactivated → sign out + show error
```

### Role-Based Routing

Route protection is done via `ProtectedRoute` component that wraps all authenticated routes:

```tsx
<ProtectedRoute allowedRoles={['society_admin', 'manager'] as Role[]}>
  <MembersPage />
</ProtectedRoute>
```

Roles are read from `user.user_metadata.role` (stored in `raw_user_meta_data` in `auth.users`).

### Session Persistence

- `useAuth()` hook calls `supabase.auth.getSession()` on mount
- Subscribes to `onAuthStateChange` for real-time session updates
- Every 60s, `ProtectedRoute` re-checks samiti/member active status and signs out if deactivated

## Frontend Structure

### Route Tree

| Path | Access | Component |
|---|---|---|
| `/login` | Public | LoginPage |
| `/dashboard` | All authenticated | DashboardPage |
| `/passbook` | member, manager, society_admin | PassbookPage |
| `/members` | manager, society_admin | MembersPage |
| `/members/:id` | manager, society_admin | MemberDetailPage |
| `/savings` | member, manager, society_admin | SavingsPage |
| `/savings/:id` | member, manager, society_admin | SavingDetailPage |
| `/loans` | member, manager, society_admin | LoansPage |
| `/loans/:id` | member, manager, society_admin | LoanDetailPage |
| `/accounting/*` | society_admin | Chart, Journal, P&L, Balance Sheet |
| `/profit-distribution` | society_admin | ProfitDistributionPage |
| `/reports/*` | manager, society_admin | Daily Cash, Society Summary, Loan Register, Overdue EMIs |
| `/admin` | society_admin | AdminSettingsPage (includes UserManagement) |
| `/super-admin` | super_admin | SuperAdminPage |
| `/super-admin/samiti/:id` | super_admin | SamitiDetailPage |
| `/super-admin/audit-log` | super_admin | SystemAuditPage |

### Component Architecture

```
src/
├── components/
│   ├── ui/           → 11 reusable primitives (Button, Card, Modal, Table, Input, Select, Badge, Spinner, etc.)
│   ├── auth/         → LoginForm, ProtectedRoute, RoleBadge
│   ├── layout/       → AppLayout, Sidebar (role-filtered navigation), Header
│   ├── members/      → MemberForm, MemberProfile, MemberCard, CreateLoginForm, MemberExitForm
│   ├── savings/      → AccountCard, TransactionList
│   ├── loans/        → LoanCard, EMIScheduleTable
│   ├── accounting/   → JournalForm, ChartOfAccountsTable, PnLReport, BalanceSheetReport
│   ├── reports/      → DailyCash, SocietySummary, LoanRegister, OverdueEMIs, MemberLedger
│   ├── settings/     → UserManagement (admin CRUD via supabaseAdmin), AccountMappings
│   └── super-admin/  → SamitiList, SamitiForm, SamitiDetail, SystemAuditLog
├── hooks/            → useAuth, useMembers, useLoans, useSavings, useAccounting, useReports, etc.
├── lib/              → supabase.ts, supabase-admin.ts, accounting.ts, profit.ts, utils.ts, export.ts
├── store/            → authStore, uiStore, formStore (Zustand)
├── types/            → database.ts (all Row interfaces)
└── config/           → constants.ts, navigation.ts
```

### Data Fetching Pattern

All data fetching follows the same pattern via custom hooks:

```ts
// Hook manages its own state
function useMembers() {
  const { samitiId, role } = useAuth()
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch on mount
  useEffect(() => { fetchMembers() }, [fetchMembers])

  // Mutations update local state optimistically
  const createMember = async (data) => {
    const { data: result } = await supabase.from('members').insert(data)
    setMembers(prev => [result, ...prev]) // optimistic update
    return result
  }

  return { members, loading, createMember, ... }
}
```

### State Management

| Store | Purpose |
|---|---|
| `useAuthStore` | User, role, samitiId, memberId (redundant with `useAuth` hook) |
| `useUIStore` | Sidebar toggle, modal management, global loading |
| `useFormStore` | Form draft persistence (save/restore/clear) |

### User Creation (Two Approaches)

| Method | Used For | Mechanism |
|---|---|---|
| **Admin Auth API** | Manager, Member users (via UserManagement + CreateLoginForm) | `supabaseAdmin.auth.admin.createUser()` |
| **Admin Auth API** | Society Admin (via SuperAdmin panel) | `supabaseAdmin.auth.admin.createUser()` |
| ~~SQL RPC~~ | ~~Deprecated~~ | ~~`create_admin_login` / `create_member_login` — raw auth.users insert~~ |

The Admin Auth API (`supabaseAdmin.auth.admin.createUser()`) is the correct approach — it goes through GoTrue and properly handles identity records, session creation, and all auth schema requirements.

## Key Features

### Loan Management
- **Two profit methods**: Flat rate and Reducing balance
- **EMI Schedule**: Auto-generated on disbursement using actuarial formulas
- **Lifecycle**: Apply → Approve → Disburse (auto-generates EMIs) → Repay → Close
- **Auto-journalization**: Loan disbursement and repayment auto-create journal entries

### Savings Management
- **Multi-account**: General, Recurring, Fixed Deposit per member
- **Balance tracking**: Running balance via `balance_after` on each transaction
- **Auto-journalization**: Deposit/withdrawal/profit auto-create journal entries

### Double-Entry Accounting
- **Chart of Accounts**: System accounts (seeded) + custom accounts
- **Journal Entries**: Debit/credit with balance validation
- **Account Mappings**: Configurable per transaction type (savings deposit, loan disbursement, etc.)
- **Reports**: Trial Balance, Profit & Loss, Balance Sheet, Income/Expense

### Profit Distribution
- **Weighted Average Balance**: Time-weighted savings balance for fair distribution
- **Distribution Basis**: Savings balance, equal share, or share-based
- **Biannual Periods**: Configurable profit periods per samiti

### Member Exit
- **Eligibility Check**: Savings balance + profit received - outstanding loan
- **Automatic Settlement**: Close savings accounts, close loans, create settlement journal entry

## Database Migrations

Located in `supabase/migrations/` (28 files, numbered sequentially):

| Range | Purpose |
|---|---|
| 001–012 | Core schema, RLS, seed data, audit trigger |
| 013–014 | Auth functions (create_member_login, create_manager_login) |
| 015 | Reset + fix helpers (jwt-based) |
| 016–020 | Loan transactions, cascade delete, college fields, payment method |
| 021–027 | Account mappings, auto-journalize triggers, profit periods, production cleanup |
| 028 | create_admin_login + fixed auth functions |

Additional scripts in `supabase/`:
- `full_setup.sql` — Complete schema + RLS + seed data
- `clean_start.sql` — Delete all test data + recreate functions
- `fix_all.sql` — Cleanup corrupted data + ensure functions exist
- `diagnose_auth_schema.sql` — Check auth schema column structure

## RLS Policies

All tables have Row-Level Security enabled. Key helper functions:
- `public.user_role()` — Extracts role from JWT metadata
- `public.user_samiti_id()` — Extracts samiti_id from JWT metadata
- `public.user_member_id()` — Extracts member_id from JWT metadata

Policy pattern:
- `super_admin` — Access all rows
- `society_admin` / `manager` — Access rows where `samiti_id = user_samiti_id()`
- `member` — Access only own records (by member_id)

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite build
npm run lint     # Oxlint
npm run preview  # Preview production build
```

## Troubleshooting Auth

**"Database error querying schema"** → The auth schema is corrupted or the auth RPC functions create user records with outdated formats. Fix:
1. Ensure `create_admin_login` / `create_member_login` functions include `is_sso_user`, `is_anonymous` in `auth.users` INSERT
2. Include `email_verified`, `phone_verified` in `identity_data` in `auth.identities` INSERT
3. Set `provider_id` = user UUID (cast to text) not email
4. Prefer `supabaseAdmin.auth.admin.createUser()` over SQL RPC functions for user creation

---

*Built with React 19, TypeScript 6, Vite 8, Tailwind CSS 4, and Supabase.*
