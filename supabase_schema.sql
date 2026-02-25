-- ERP AC DATABASE SCHEMA INITIALIZATION

-- 1. PRODUCTS (Inventory)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    price_wholesale DECIMAL(12, 2) DEFAULT 0,
    price_retail DECIMAL(12, 2) DEFAULT 0,
    stock_millenio INTEGER DEFAULT 0,
    stock_vulcano INTEGER DEFAULT 0,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CLIENTS (CRM)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    balance_millenio DECIMAL(12, 2) DEFAULT 0,
    balance_vulcano DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SALES (POS)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT,
    client_id UUID REFERENCES public.clients(id),
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    method TEXT,
    total DECIMAL(12, 2) DEFAULT 0,
    total_m DECIMAL(12, 2) DEFAULT 0,
    total_v DECIMAL(12, 2) DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ACCOUNTS (Finances)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    bank TEXT,
    account_number TEXT,
    balance DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. MOVEMENTS (Finance History)
CREATE TABLE IF NOT EXISTS public.movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    type TEXT, -- 'entrada', 'salida', 'transferencia'
    amount DECIMAL(12, 2) DEFAULT 0,
    concept TEXT,
    notes TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT,
    amount DECIMAL(12, 2) DEFAULT 0,
    expense_date DATE DEFAULT CURRENT_DATE,
    company TEXT,
    category TEXT,
    is_recurring BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. RECURRING EXPENSES
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT,
    amount DECIMAL(12, 2) DEFAULT 0,
    company TEXT,
    category TEXT,
    frequency TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. CASH CLOSINGS (Arqueos)
CREATE TABLE IF NOT EXISTS public.cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    company TEXT,
    account_id UUID REFERENCES public.accounts(id),
    system_amount DECIMAL(12, 2) DEFAULT 0,
    physical_amount DECIMAL(12, 2) DEFAULT 0,
    difference DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE ROW LEVEL SECURITY (Optional but recommended)
-- For now, we allow authenticated users full access
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

-- Creating simple permissive policies (For development)
-- In production, these should be restricted to specific user IDs
CREATE POLICY "Allow all for authenticated" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.sales FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.movements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.recurring_expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.cash_closings FOR ALL TO authenticated USING (true);
