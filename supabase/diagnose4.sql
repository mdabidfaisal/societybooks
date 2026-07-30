-- Compare admin user metadata with our created user
SELECT email, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
FROM auth.users
WHERE email IN ('admin@samiti.test', 'wyzeekllc@gmail.com');

-- Check if our manager has an identity
SELECT provider_id, provider, identity_data
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'wyzeekllc@gmail.com' LIMIT 1);

-- Check sessions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'sessions'
ORDER BY ordinal_position;
