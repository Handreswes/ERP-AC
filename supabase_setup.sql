-- ERP AC - SUPABASE SCHEMA SETUP
-- Copy and paste this script into the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    provider TEXT,
    cost DECIMAL DEFAULT 0,
    "priceFinal" DECIMAL DEFAULT 0,
    "priceWholesale" DECIMAL DEFAULT 0,
    "stockMillenio" INTEGER DEFAULT 0,
    "stockVulcano" INTEGER DEFAULT 0,
    company TEXT,
    active BOOLEAN DEFAULT true,
    image TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    type TEXT,
    "businessName" TEXT,
    city TEXT,
    address TEXT,
    "balanceMillenio" DECIMAL DEFAULT 0,
    "balanceVulcano" DECIMAL DEFAULT 0,
    "totalPurchases" DECIMAL DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    "clientId" TEXT REFERENCES clients(id) ON DELETE SET NULL,
    "clientName" TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL DEFAULT 0,
    "totalM" DECIMAL DEFAULT 0,
    "totalV" DECIMAL DEFAULT 0,
    method TEXT,
    "accountId" TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    concept TEXT,
    amount DECIMAL DEFAULT 0,
    category TEXT,
    company TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 5. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    type TEXT,
    company TEXT,
    balance DECIMAL DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 6. Movements Table
CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    company TEXT,
    type TEXT,
    "originAccount" TEXT,
    "destinationAccount" TEXT,
    amount DECIMAL DEFAULT 0,
    concept TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 7. Recurring Expenses Table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id TEXT PRIMARY KEY,
    concept TEXT,
    amount DECIMAL DEFAULT 0,
    day INTEGER,
    company TEXT,
    active BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 8. Cash Closings Table
CREATE TABLE IF NOT EXISTS cash_closings (
    id TEXT PRIMARY KEY,
    company TEXT,
    system DECIMAL DEFAULT 0,
    physical DECIMAL DEFAULT 0,
    diff DECIMAL DEFAULT 0,
    date TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 9. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    "clientId" TEXT REFERENCES clients(id) ON DELETE SET NULL,
    "clientName" TEXT,
    amount DECIMAL DEFAULT 0,
    method TEXT,
    company TEXT,
    notes TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 10. Transit Orders Table (Inventory)
CREATE TABLE IF NOT EXISTS transit_orders (
    id TEXT PRIMARY KEY,
    company TEXT,
    concept TEXT,
    amount DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS for easy testing
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE transit_orders DISABLE ROW LEVEL SECURITY;
