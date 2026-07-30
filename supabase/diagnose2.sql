-- Check which schema pgcrypto is in
SELECT n.nspname AS schema_name, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('gen_salt', 'crypt')
ORDER BY p.proname, n.nspname;

-- Check auth.users columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Check auth.identities for any leftover corrupted rows
SELECT * FROM auth.identities WHERE identity_data->>'email' = 'wyzeekllc@gmail.com';
SELECT * FROM auth.users WHERE email = 'wyzeekllc@gmail.com';
