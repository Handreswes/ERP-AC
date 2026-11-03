-- ========================================================
-- ERP AC - SUPABASE PERFORMANCE & DISK IO OPTIMIZATION
-- ========================================================
-- Este script crea índices B-Tree en las columnas más consultadas
-- del ERP. Evita escaneos secuenciales completos de disco (Seq Scans),
-- reduciendo drásticamente el uso de CPU y el consumo de Disk IO Budget.

-- 1. Tabla PRODUCTS
CREATE INDEX IF NOT EXISTS idx_products_updatedAt ON public.products ("updatedAt");
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products ("active");
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products ("company");

-- 2. Tabla SALES
CREATE INDEX IF NOT EXISTS idx_sales_updatedAt ON public.sales ("updatedAt");
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales ("date");
CREATE INDEX IF NOT EXISTS idx_sales_clientId ON public.sales ("clientId");
CREATE INDEX IF NOT EXISTS idx_sales_delivery ON public.sales ("delivery_type", "delivery_status");

-- 3. Tabla ORDERS (Consultada periódicamente por el badge de logística)
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders ("status");
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON public.orders ("createdAt");

-- 4. Tabla CLIENTS
CREATE INDEX IF NOT EXISTS idx_clients_updatedAt ON public.clients ("updatedAt");
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients ("company");
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients ("active");

-- 5. Tabla MOVEMENTS & EXPENSES
CREATE INDEX IF NOT EXISTS idx_movements_date ON public.movements ("date");
CREATE INDEX IF NOT EXISTS idx_movements_company ON public.movements ("company");
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses ("date");
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses ("company");

-- 6. Tabla STOCK_ENTRIES & PAYMENTS
CREATE INDEX IF NOT EXISTS idx_stock_entries_createdAt ON public.stock_entries ("createdAt");
CREATE INDEX IF NOT EXISTS idx_stock_entries_company ON public.stock_entries ("company");
CREATE INDEX IF NOT EXISTS idx_payments_updatedAt ON public.payments ("updatedAt");
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments ("company");

-- 7. Tabla SELLERS
CREATE INDEX IF NOT EXISTS idx_sellers_updatedAt ON public.sellers ("updatedAt");
CREATE INDEX IF NOT EXISTS idx_sellers_company ON public.sellers ("company");

-- 8. HABILITAR SUPABASE REALTIME (Actualizaciones instantáneas < 1 seg entre usuarios sin consumir Disk IO)
-- Permite que Cindy y Andrés vean ventas, abonos, clientes y stock inmediatamente en pantalla.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.sales, 
        public.payments, 
        public.clients, 
        public.products, 
        public.accounts, 
        public.expenses, 
        public.movements, 
        public.orders;
EXCEPTION WHEN OTHERS THEN
    -- Si alguna ya estaba agregada a la publicación, no genera error
    NULL;
END $$;

-- Mantenimiento y actualización de estadísticas del planificador de PostgreSQL
ANALYZE public.products;
ANALYZE public.sales;
ANALYZE public.orders;
ANALYZE public.clients;
ANALYZE public.movements;
ANALYZE public.expenses;
ANALYZE public.stock_entries;
ANALYZE public.payments;
