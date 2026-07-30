-- Fix: rewrite helper functions to use auth.jwt() instead of querying auth.users
-- auth.jwt() reads claims from the JWT token, no extra permissions needed

CREATE OR REPLACE FUNCTION public.user_samiti_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'samiti_id')::UUID;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$;

CREATE OR REPLACE FUNCTION public.user_member_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'member_id')::UUID;
$$;
