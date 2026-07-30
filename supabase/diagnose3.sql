-- Check for triggers on auth.users
SELECT tgname AS trigger_name
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND tgname NOT LIKE '%\_%\_%';

-- Check auth schema migration version
SELECT version FROM auth.schema_migrations ORDER BY version DESC LIMIT 5;

-- Check if existing working admin user has identity
SELECT provider_id, provider, identity_data
FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@samiti.test' LIMIT 1);
