ALTER TABLE savings_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'bkash', 'nagad', 'rocket'));

ALTER TABLE loan_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'bkash', 'nagad', 'rocket'));
