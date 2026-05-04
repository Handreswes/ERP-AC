// Supabase Configuration
const SUPABASE_URL = 'https://zuondbguopirimvfuehu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_29SdlPI3zzDkNvvEO38kOQ_2NTwiTC_';

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
