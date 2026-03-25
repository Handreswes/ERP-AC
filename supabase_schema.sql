-- ERP AC DATABASE SCHEMA (V2 - Strict CamelCase matching Frontend JS)
-- WARNING: This will drop existing tables and recreate them to match the JS codebase perfectly.

DROP TABLE IF EXISTS public.products, public.clients, public.sales, public.accounts, public.movements, public.expenses, public.recurring_expenses, public.cash_closings, public.transit_orders, public.payments, public.sellers, public.tucompras_sales, public.campaigns, public.tucompras_customers, public.stock_entries CASCADE;

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
    "type" TEXT,                     /* Added to match frontend crm.js */
    "businessName" TEXT,             /* Added to match frontend crm.js */
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
    "delivery_type" TEXT,
    "delivery_status" TEXT,
    "carrier" TEXT,
    "tracking_number" TEXT,
    "shipped_at" TEXT,
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
    "paymentDetails" TEXT,           /* Added to prevent crashes when hidden input is submitted */
    "date" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sellers (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT,
    "status" TEXT,                       /* Added to match frontend 'active'/'inactive' */
    "commissionRate" DECIMAL(5, 2) DEFAULT 0,
    "active" BOOLEAN DEFAULT true,       /* Kept for backwards config compatibility */
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tucompras_sales (
    "id" TEXT PRIMARY KEY,
    "date" TEXT,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "seller_id" TEXT,
    "carrier" TEXT,
    "tracking_number" TEXT,
    "inventory_source" TEXT,
    "status" TEXT,
    "shipping_cost" DECIMAL(12, 2) DEFAULT 0,
    "shipping_loss" DECIMAL(12, 2) DEFAULT 0,
    "commission_paid" DECIMAL(12, 2) DEFAULT 0,
    "items" JSONB DEFAULT '[]'::jsonb,
    "money_confirmed" BOOLEAN DEFAULT false,
    "money_confirmed_at" TEXT,
    "is_paid_to_inventory" BOOLEAN DEFAULT false,
    "inventory_paid_at" TEXT,
    "is_commission_paid" BOOLEAN DEFAULT false,
    "commission_paid_at" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    "id" TEXT PRIMARY KEY,
    "seller_id" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "goal_type" TEXT,
    "goal_value" DECIMAL(12, 2) DEFAULT 0,
    "status" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tucompras_customers (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT,
    "dept" TEXT,             /* Added from crm object */
    "city" TEXT,
    "address" TEXT,
    "totalPurchases" INTEGER DEFAULT 0,
    "totalSpent" DECIMAL(12, 2) DEFAULT 0,
    "lastPurchase" TEXT,
    "tags" JSONB DEFAULT '[]'::jsonb,
    "created_at" TEXT,       /* Exact match from JS created_at */
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.stock_entries (
    "id" TEXT PRIMARY KEY,
    "date" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "quantity" INTEGER,
    "company" TEXT,
    "source" TEXT,
    "notes" TEXT,
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
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Allow all" ON public.stock_entries FOR ALL USING (true);
