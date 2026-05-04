
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC/.env', 'utf8');
const url = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
    const { error } = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "acceptNotifications" BOOLEAN DEFAULT true; ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "hasAccount" BOOLEAN DEFAULT false;' });
    if (error) {
        console.error('Error:', error);
        // If RPC doesn't exist, we might be in trouble, but let's try.
    } else {
        console.log('Success');
    }
}
run();
