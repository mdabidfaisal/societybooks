#!/bin/bash
# Seed local supabase with demo data
# Usage: bash scripts/seed-local.sh

SUPABASE_URL="${VITE_SUPABASE_URL}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

echo "Seeding demo samiti..."
curl -X POST "${SUPABASE_URL}/rest/v1/samiti_settings" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"samiti_name":"Samabaya Samiti Demo","samiti_code":"SAM001","shares_enabled":false,"share_value":0,"default_profit_method":"reducing_balance","default_profit_rate":12.00}'

echo "Done seeding."
