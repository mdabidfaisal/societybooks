-- Allow managers and members to read their own samiti's settings.
-- This is required so every user (not just society_admin) sees the samiti
-- name/address/phone in the header and in dynamic PDF/Excel report headers.
-- Only society_admin and super_admin could SELECT before, so members and
-- managers fell back to the generic app name in exported reports.

DROP POLICY IF EXISTS manager_view_samiti ON samiti_settings;
CREATE POLICY manager_view_samiti ON samiti_settings
  FOR SELECT USING (
    user_role() = 'manager' AND user_samiti_id() = id
  );

DROP POLICY IF EXISTS member_view_samiti ON samiti_settings;
CREATE POLICY member_view_samiti ON samiti_settings
  FOR SELECT USING (
    user_role() = 'member' AND user_samiti_id() = id
  );
