-- Run this in Supabase SQL Editor and share the result

-- 1. Check identities table columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'identities' 
ORDER BY ordinal_position;

-- 2. Check for auto-create identity trigger on auth.users
SELECT tgname FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass AND tgname LIKE '%identit%';

-- 3. Clean up corrupted test user
DELETE FROM auth.identities WHERE email = 'wyzeekllc@gmail.com';
DELETE FROM auth.identities WHERE provider = 'email' AND identity_data->>'email' = 'wyzeekllc@gmail.com';
DELETE FROM auth.users WHERE email = 'wyzeekllc@gmail.com';
DELETE FROM auth.identities WHERE identity_data->>'email' = 'wyzeekllc@gmail.com';
