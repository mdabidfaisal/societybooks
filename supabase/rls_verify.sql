-- =============================================================
-- RLS & Integrity — Verification Script
-- Run this to confirm all policies, triggers, and audit are active
-- =============================================================

-- 1. Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- 2. List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. List all triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 4. List all helper functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema IN ('public')
  AND routine_name IN ('user_samiti_id', 'user_role', 'user_member_id', 'heartbeat', 'prevent_financial_delete', 'audit_trigger_func')
ORDER BY routine_name;
