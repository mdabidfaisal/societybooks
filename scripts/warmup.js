/**
 * Supabase keep-alive script
 * Run via cron every 3 days to prevent free-tier project pausing.
 * Usage: node scripts/warmup.js
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

async function warmup() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/heartbeat`
  const response = await fetch(url, {
    headers: { apikey: ANON_KEY },
  })
  console.log(`[${new Date().toISOString()}] Warmup ping: ${response.status} ${response.statusText}`)
}

warmup().catch(console.error)
