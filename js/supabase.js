// Supabase Configuration
const SUPABASE_URL = 'https://zuondbguopirimvfuehu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b25kYmd1b3BpcmltdmZ1ZWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMjk2NiwiZXhwIjoyMDg3NjA4OTY2fQ.9Zja0di6OMtWwFyigiZiWnXo0burILHTVAuBOf6EhUE';

window.initSupabase = () => {
    if (window.supabaseClient) return window.supabaseClient;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase: Client initialized successfully');
        return window.supabaseClient;
    } else {
        console.error('Supabase: Global library not found');
        return null;
    }
};

window.handleSupabaseResponse = async (promise) => {
    const { data, error } = await promise;
    if (error) {
        console.error('Supabase Error:', error.message);
        throw error;
    }
    return data;
};
