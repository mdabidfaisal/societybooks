-- Check: does wyzeekllc@gmail.com still exist?
SELECT id, email, raw_user_meta_data, raw_app_meta_data
FROM auth.users
WHERE email = 'wyzeekllc@gmail.com';

-- If found, force delete it:
DELETE FROM auth.identities WHERE identity_data->>'email' = 'wyzeekllc@gmail.com';
DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'wyzeekllc@gmail.com');
DELETE FROM auth.refresh_tokens WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE email = 'wyzeekllc@gmail.com');
DELETE FROM auth.users WHERE email = 'wyzeekllc@gmail.com';

-- Also delete any other users without a proper role (stray corrupted records)
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data IS NULL
     OR raw_user_meta_data->>'role' IS NULL
     OR raw_user_meta_data->>'role' NOT IN ('super_admin', 'society_admin', 'manager', 'member')
);
DELETE FROM auth.sessions WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data IS NULL
     OR raw_user_meta_data->>'role' IS NULL
     OR raw_user_meta_data->>'role' NOT IN ('super_admin', 'society_admin', 'manager', 'member')
);
DELETE FROM auth.refresh_tokens WHERE user_id::uuid IN (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data IS NULL
     OR raw_user_meta_data->>'role' IS NULL
     OR raw_user_meta_data->>'role' NOT IN ('super_admin', 'society_admin', 'manager', 'member')
);
DELETE FROM auth.users
WHERE raw_user_meta_data IS NULL
   OR raw_user_meta_data->>'role' IS NULL
   OR raw_user_meta_data->>'role' NOT IN ('super_admin', 'society_admin', 'manager', 'member');

-- Verify only super_admin remains
SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users;
