-- ERP AC DATABASE SCHEMA (V2 - Strict CamelCase matching Frontend JS)
-- DROP existing tables safely if you are starting fresh
-- DROP TABLE IF EXISTS public.products, public.clients, public.sales, public.accounts, public.movements, public.expenses, public.recurring_expenses, public.cash_closings, public.transit_orders, public.payments, public.sellers, public.tucompras_sales, public.campaigns, public.tucompras_customers CASCADE;

CREATE TABLE IF NOT EXISTS public.products (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "provider" TEXT,
    "cost" DECIMAL(12, 2) DEFAULT 0,
    "priceWholesale" DECIMAL(12, 2) DEFAULT 0,
    "priceFinal" DECIMAL(12, 2) DEFAULT 0,
    "commissionBase" DECIMAL(12, 2) DEFAULT 0,
    "stockMillenio" INTEGER DEFAULT 0,
    "stockVulcano" INTEGER DEFAULT 0,
    "company" TEXT,
    "active" BOOLEAN DEFAULT true,
    "image" JSONB DEFAULT '[]'::jsonb,
    "ref" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.clients (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "level" TEXT,
    "address" TEXT,
    "city" TEXT,
    "balanceMillenio" DECIMAL(12, 2) DEFAULT 0,
    "balanceVulcano" DECIMAL(12, 2) DEFAULT 0,
    "salesMillenio" DECIMAL(12, 2) DEFAULT 0,
    "salesVulcano" DECIMAL(12, 2) DEFAULT 0,
    "lastPurchase" TEXT,
    "totalPurchases" INTEGER DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sales (
    "id" TEXT PRIMARY KEY,
    "clientId" TEXT,
    "clientName" TEXT,
    "items" JSONB DEFAULT '[]'::jsonb,
    "total" DECIMAL(12, 2) DEFAULT 0,
    "totalM" DECIMAL(12, 2) DEFAULT 0,
    "totalV" DECIMAL(12, 2) DEFAULT 0,
    "method" TEXT,
    "accountId" TEXT,
    "date" TEXT,
    "company" TEXT,
    "sellerId" TEXT,
    "sellerName" TEXT,
    "commissionAmount" DECIMAL(12, 2) DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounts (
    "id" TEXT PRIMARY KEY,
    "company" TEXT,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "accountType" TEXT,
    "accountNumber" TEXT,
    "balance" DECIMAL(12, 2) DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.movements (
    "id" TEXT PRIMARY KEY,
    "company" TEXT,
    "type" TEXT,
    "originAccount" TEXT,
    "destinationAccount" TEXT,
    "amount" DECIMAL(12, 2) DEFAULT 0,
    "concept" TEXT,
    "date" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.expenses (
    "id" TEXT PRIMARY KEY,
    "company" TEXT,
    "category" TEXT,
    "concept" TEXT,
    "amount" DECIMAL(12, 2) DEFAULT 0,
    "originAccount" TEXT,
    "date" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    "id" TEXT PRIMARY KEY,
    "company" TEXT,
    "concept" TEXT,
    "amount" DECIMAL(12, 2) DEFAULT 0,
    "dueDay" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.cash_closings (
    "id" TEXT PRIMARY KEY,
    "company" TEXT,
    "system" DECIMAL(12, 2) DEFAULT 0,
    "physical" DECIMAL(12, 2) DEFAULT 0,
    "diff" DECIMAL(12, 2) DEFAULT 0,
    "date" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.transit_orders (
    "id" TEXT PRIMARY KEY,
    "company" TEXT,
    "concept" TEXT,
    "amount" DECIMAL(12, 2) DEFAULT 0,
    "date" TEXT,
    "status" TEXT DEFAULT 'pending',
    "receivedAt" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payments (
    "id" TEXT PRIMARY KEY,
    "clientId" TEXT,
    "clientName" TEXT,
    "amount" DECIMAL(12, 2) DEFAULT 0,
    "method" TEXT,
    "company" TEXT,
    "accountId" TEXT,
    "date" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sellers (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT,
    "commissionRate" DECIMAL(5, 2) DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tucompras_sales (
    "id" TEXT PRIMARY KEY,
    "cliente" TEXT,
    "clientId" TEXT,
    "items" JSONB DEFAULT '[]'::jsonb,
    "subtotal" DECIMAL(12, 2) DEFAULT 0,
    "envio" DECIMAL(12, 2) DEFAULT 0,
    "total" DECIMAL(12, 2) DEFAULT 0,
    "estado" TEXT,
    "recaudador" TEXT,
    "guia" TEXT,
    "fecha" TEXT,
    "vendedorId" TEXT,
    "vendedorName" TEXT,
    "comisionTotal" DECIMAL(12, 2) DEFAULT 0,
    "comisionPagada" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "budget" DECIMAL(12, 2) DEFAULT 0,
    "platform" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "status" TEXT,
    "leadsGenerated" INTEGER DEFAULT 0,
    "costPerLead" DECIMAL(12, 2) DEFAULT 0,
    "salesConverted" INTEGER DEFAULT 0,
    "revenueGenerated" DECIMAL(12, 2) DEFAULT 0,
    "roas" DECIMAL(10, 2) DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tucompras_customers (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "address" TEXT,
    "totalPurchases" INTEGER DEFAULT 0,
    "totalSpent" DECIMAL(12, 2) DEFAULT 0,
    "lastPurchase" TEXT,
    "tags" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Configuration
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tucompras_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tucompras_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.clients FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.sales FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.accounts FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.movements FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.recurring_expenses FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.cash_closings FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.transit_orders FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.sellers FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.tucompras_sales FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.campaigns FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.tucompras_customers FOR ALL USING (true);
