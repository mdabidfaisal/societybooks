-- Step 1: Delete the broken user record
DELETE FROM auth.identities WHERE provider_id = 'codeprophet.tech@gmail.com' AND provider = 'email';
DELETE FROM auth.users WHERE email = 'codeprophet.tech@gmail.com';

-- Step 2: Verify it's gone
SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users WHERE email = 'codeprophet.tech@gmail.com';
