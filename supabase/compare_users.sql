SELECT id, email, is_sso_user, is_anonymous, confirmed_at, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, role, aud, created_at
FROM auth.users
WHERE email = 'codeprophet.tech@gmail.com'
   OR raw_user_meta_data->>'role' = 'super_admin'
ORDER BY created_at;
