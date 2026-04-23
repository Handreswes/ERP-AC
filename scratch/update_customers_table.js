
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC/.env', 'utf8');
const url = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
    const { error } = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE public.tucompras_customers ADD COLUMN IF NOT EXISTS "email" TEXT; ALTER TABLE public.tucompras_customers ADD COLUMN IF NOT EXISTS "auth_id" UUID;' });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success');
    }
}
run();
