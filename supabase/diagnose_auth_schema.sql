-- =============================================================
-- Diagnose auth schema and create a robust user creation function
-- =============================================================

-- Step 1: Check auth.users columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Check auth.identities columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'identities'
ORDER BY ordinal_position;

-- Step 3: Check auth.sessions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'sessions'
ORDER BY ordinal_position;

-- Step 4: Check auth.refresh_tokens columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'refresh_tokens'
ORDER BY ordinal_position;
