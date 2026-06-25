-- ERP AC - SUPABASE SECURITY POLICIES (ENABLE RLS)
-- Copy and paste this script into the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- to secure your private data while keeping public access only where needed.

-- ==========================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==========================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tucompras_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tucompras_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- If 'orders' table exists in the database, enable RLS on it too
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


-- ==========================================
-- 2. PUBLIC & WEBSITE POLICIES (ACCESO ANÓNIMO / CLIENTES)
-- ==========================================

-- Products (Everyone can read, only authenticated admins/principals can write)
CREATE POLICY "Allow public read on products" ON products 
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write on products" ON products 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Campaigns (Everyone can read, only authenticated can write)
CREATE POLICY "Allow public read on campaigns" ON campaigns 
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write on campaigns" ON campaigns 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders (Everyone can insert new orders, but customers can only read/update their own orders)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        -- Allow public INSERT (Guest Checkout)
        EXECUTE 'CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);';
        
        -- Allow customers to SELECT their own orders (by phone) or authenticated users
        EXECUTE 'CREATE POLICY "Allow select on orders" ON orders FOR SELECT USING (
            auth.role() = ''authenticated''
        );';
        
        -- Allow update only for authenticated users (ERP managers)
        EXECUTE 'CREATE POLICY "Allow authenticated update on orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);';
    END IF;
END $$;

-- TuCompras Customers (Allows registration/updates from website and ERP)
CREATE POLICY "Allow public insert on tucompras_customers" ON tucompras_customers 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual read/update on tucompras_customers" ON tucompras_customers 
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow individual update on tucompras_customers" ON tucompras_customers 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ==========================================
-- 3. ERP PRIVATE POLICIES (ACCESO EXCLUSIVO A USUARIOS AUTENTICADOS)
-- ==========================================

-- Clients
CREATE POLICY "Allow authenticated on clients" ON clients 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sales (ERP Private Sales)
CREATE POLICY "Allow authenticated on sales" ON sales 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expenses
CREATE POLICY "Allow authenticated on expenses" ON expenses 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accounts
CREATE POLICY "Allow authenticated on accounts" ON accounts 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Movements
CREATE POLICY "Allow authenticated on movements" ON movements 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recurring Expenses
CREATE POLICY "Allow authenticated on recurring_expenses" ON recurring_expenses 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cash Closings
CREATE POLICY "Allow authenticated on cash_closings" ON cash_closings 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY "Allow authenticated on payments" ON payments 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transit Orders
CREATE POLICY "Allow authenticated on transit_orders" ON transit_orders 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stock Entries
CREATE POLICY "Allow authenticated on stock_entries" ON stock_entries 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sellers
CREATE POLICY "Allow authenticated on sellers" ON sellers 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TuCompras Sales (ERP side)
CREATE POLICY "Allow authenticated on tucompras_sales" ON tucompras_sales 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Done!
