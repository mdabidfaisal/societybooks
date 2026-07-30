-- Profit period configuration for fair time-weighted distribution
-- Two configurable periods per year (default: Jan-Jun, Jul-Dec)

ALTER TABLE samiti_settings
  ADD COLUMN IF NOT EXISTS profit_period_1_start_month INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS profit_period_1_end_month   INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS profit_period_2_start_month INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS profit_period_2_end_month   INTEGER NOT NULL DEFAULT 12;
