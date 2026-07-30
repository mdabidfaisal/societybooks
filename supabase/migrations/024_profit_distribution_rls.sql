-- RLS policies for profit_distributions
CREATE POLICY admin_profit_distributions ON profit_distributions
  FOR ALL USING (
    user_role() = 'society_admin' AND user_samiti_id() = samiti_id
  );
CREATE POLICY manager_view_profit_distributions ON profit_distributions
  FOR SELECT USING (
    user_role() = 'manager' AND user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_profit_distributions ON profit_distributions
  FOR ALL USING (user_role() = 'super_admin');

-- RLS policies for profit_distribution_items (scoped to parent distribution)
CREATE POLICY admin_profit_distribution_items ON profit_distribution_items
  FOR ALL USING (
    user_role() = 'society_admin'
    AND profit_distribution_id IN (
      SELECT id FROM profit_distributions WHERE samiti_id = user_samiti_id()
    )
  );
CREATE POLICY manager_view_profit_distribution_items ON profit_distribution_items
  FOR SELECT USING (
    user_role() = 'manager'
    AND profit_distribution_id IN (
      SELECT id FROM profit_distributions WHERE samiti_id = user_samiti_id()
    )
  );
CREATE POLICY super_admin_profit_distribution_items ON profit_distribution_items
  FOR ALL USING (user_role() = 'super_admin');

-- Members can view their own distribution items
CREATE POLICY member_own_distribution_items ON profit_distribution_items
  FOR SELECT USING (
    user_role() = 'member' AND member_id = user_member_id()
  );
