export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      samiti_settings: {
        Row: SamitiSettingsRow
        Insert: Partial<SamitiSettingsRow>
        Update: Partial<SamitiSettingsRow>
      }
      members: {
        Row: MemberRow
        Insert: Partial<MemberRow>
        Update: Partial<MemberRow>
      }
      savings_accounts: {
        Row: SavingsAccountRow
        Insert: Partial<SavingsAccountRow>
        Update: Partial<SavingsAccountRow>
      }
      savings_transactions: {
        Row: SavingsTransactionRow
        Insert: Partial<SavingsTransactionRow>
        Update: Partial<SavingsTransactionRow>
      }
      loans: {
        Row: LoanRow
        Insert: Partial<LoanRow>
        Update: Partial<LoanRow>
      }
      loan_emi_schedule: {
        Row: LoanEMIRow
        Insert: Partial<LoanEMIRow>
        Update: Partial<LoanEMIRow>
      }
      loan_transactions: {
        Row: LoanTransactionRow
        Insert: Partial<LoanTransactionRow>
        Update: Partial<LoanTransactionRow>
      }
      chart_of_accounts: {
        Row: ChartOfAccountRow
        Insert: Partial<ChartOfAccountRow>
        Update: Partial<ChartOfAccountRow>
      }
      journal_entries: {
        Row: JournalEntryRow
        Insert: Partial<JournalEntryRow>
        Update: Partial<JournalEntryRow>
      }
      journal_entry_lines: {
        Row: JournalEntryLineRow
        Insert: Partial<JournalEntryLineRow>
        Update: Partial<JournalEntryLineRow>
      }
      profit_distributions: {
        Row: ProfitDistributionRow
        Insert: Partial<ProfitDistributionRow>
        Update: Partial<ProfitDistributionRow>
      }
      profit_distribution_items: {
        Row: ProfitDistributionItemRow
        Insert: Partial<ProfitDistributionItemRow>
        Update: Partial<ProfitDistributionItemRow>
      }
      audit_log: {
        Row: AuditLogRow
        Insert: Partial<AuditLogRow>
        Update: Partial<AuditLogRow>
      }
      system_account_mappings: {
        Row: SystemAccountMappingRow
        Insert: Partial<SystemAccountMappingRow>
        Update: Partial<SystemAccountMappingRow>
      }
    }
    Functions: {
      user_samiti_id: { Args: Record<string, never>; Returns: string }
      user_role: { Args: Record<string, never>; Returns: string }
      user_member_id: { Args: Record<string, never>; Returns: string }
    }
  }
}

export interface SamitiSettingsRow {
  id: string
  samiti_name: string
  samiti_code: string
  shares_enabled: boolean
  share_value: number
  default_profit_method: 'flat' | 'reducing_balance'
  default_profit_rate: number
  address: string | null
  phone: string | null
  is_active: boolean
  profit_period_1_start_month: number
  profit_period_1_end_month: number
  profit_period_2_start_month: number
  profit_period_2_end_month: number
  created_at: string
}

export interface MemberRow {
  id: string
  samiti_id: string
  member_number: string
  status: 'active' | 'inactive' | 'exited'

  name: string
  name_bn: string | null
  guardian_name: string | null
  mother_name: string | null
  spouse_name: string | null
  date_of_birth: string | null
  gender: string | null
  blood_group: string | null
  marital_status: string | null
  nid: string | null

  college_name: string | null
  college_code: string | null
  designation: string | null
  department: string | null
  employee_id: string | null
  mpo_index_number: string | null
  mpo_enrolled_date: string | null
  govt_service_date: string | null
  present_college_joining_date: string | null
  retirement_date: string | null
  employment_status: string | null

  phone: string | null
  email: string | null
  present_address: string | null
  permanent_address: string | null

  nominee_name: string | null
  nominee_relation: string | null
  nominee_nid: string | null
  nominee_phone: string | null
  nominee_address: string | null

  bank_name: string | null
  bank_account_number: string | null
  branch_name: string | null
  routing_number: string | null

  qualification: string | null
  remarks: string | null
  photo_url: string | null
  join_date: string
  exit_date: string | null
  exit_settlement_amount: number | null
  exit_note: string | null
  created_at: string
  updated_at: string
}

export interface SavingsAccountRow {
  id: string
  samiti_id: string
  member_id: string
  account_type: 'general' | 'recurring' | 'fixed_deposit'
  account_number: string
  opened_date: string
  status: 'active' | 'closed'
  created_at: string
}

export interface SavingsTransactionRow {
  id: string
  samiti_id: string
  savings_account_id: string
  transaction_type: 'deposit' | 'withdrawal' | 'profit' | 'correction' | 'exit_settlement'
  amount: number
  balance_after: number
  reference: string | null
  reason_note: string | null
  performed_by: string
  payment_method: string | null
  created_at: string
}

export interface LoanRow {
  id: string
  samiti_id: string
  member_id: string
  loan_number: string
  amount: number
  purpose: string | null
  tenure_months: number
  profit_method: 'flat' | 'reducing_balance'
  profit_rate: number
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed'
  approved_by: string | null
  approved_at: string | null
  disbursed_at: string | null
  created_at: string
  updated_at: string
}

export interface LoanEMIRow {
  id: string
  loan_id: string
  installment_no: number
  due_date: string
  principal_amount: number
  profit_amount: number
  total_amount: number
  paid_amount: number
  paid_at: string | null
  status: 'pending' | 'paid' | 'partial' | 'overdue'
  created_at: string
}

export interface LoanTransactionRow {
  id: string
  loan_id: string
  samiti_id: string
  emi_id: string | null
  transaction_type: string
  amount: number
  principal_amount: number
  profit_amount: number
  balance_after: number
  reference: string | null
  reason_note: string | null
  payment_method: string | null
  performed_by: string
  created_at: string
}

export interface ChartOfAccountRow {
  id: string
  samiti_id: string
  account_code: string
  account_name: string
  account_type: 'income' | 'expense' | 'asset' | 'liability' | 'equity'
  is_system: boolean
  is_active: boolean
  created_at: string
}

export interface JournalEntryRow {
  id: string
  samiti_id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: string
  reference_id: string | null
  reference_table: string | null
  total_debit: number
  total_credit: number
  performed_by: string
  created_at: string
}

export interface JournalEntryLineRow {
  id: string
  journal_entry_id: string
  account_id: string
  debit_amount: number
  credit_amount: number
  description: string | null
  created_at: string
}

export interface ProfitDistributionRow {
  id: string
  samiti_id: string
  distribution_number: string
  distribution_date: string
  total_profit_amount: number
  distribution_basis: 'savings' | 'equal' | 'share'
  status: 'draft' | 'distributed'
  notes: string | null
  performed_by: string
  created_at: string
}

export interface ProfitDistributionItemRow {
  id: string
  profit_distribution_id: string
  member_id: string
  basis_amount: number
  distribution_amount: number
  savings_transaction_id: string | null
  created_at: string
}

export interface AuditLogRow {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: Json | null
  new_data: Json | null
  changed_by: string
  changed_at: string
}

export interface SystemAccountMappingRow {
  id: string
  samiti_id: string
  transaction_type: string
  debit_account_code: string
  credit_account_code: string
  created_at: string
}
