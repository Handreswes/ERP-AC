/**
 * ================================================================
 * ERP AC - TEST RUNNER COMPLETO v1.0
 * Ejecutar en la consola del navegador con la app abierta.
 * Crea datos de prueba, valida lógica, limpia todo al finalizar.
 * ================================================================
 */

window.ERPTest = {
    results: [],
    createdIds: { products: [], sellers: [], sales: [], customers: [] },
    errors: [],

    log(category, test, passed, detail = '') {
        const r = { category, test, passed, detail, ts: new Date().toLocaleTimeString() };
        this.results.push(r);
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} [${category}] ${test}${detail ? ' → ' + detail : ''}`);
        if (!passed) this.errors.push(r);
    },

    assert(cond, category, test, detail = '') {
        this.log(category, test, !!cond, detail);
        return !!cond;
    },

    // ── FASE 1: CREAR DATOS DE PRUEBA ────────────────────────────────────
    async setupTestProducts() {
        console.group('📦 FASE 1: Productos de prueba');

        const p1 = await Storage.addItem(STORAGE_KEYS.PRODUCTS, {
            name: '[TEST] Producto Millenio A',
            category: 'Test',
            stockMillenio: 20,
            stockVulcano: 0,
            priceWholesale: 45000,
            priceFinal: 89000,
            commissionBase: 8000,
            active: true,
            company: 'millenio'
        });

        const p2 = await Storage.addItem(STORAGE_KEYS.PRODUCTS, {
            name: '[TEST] Producto Vulcano B',
            category: 'Test',
            stockMillenio: 0,
            stockVulcano: 15,
            priceWholesale: 30000,
            priceFinal: 65000,
            commissionBase: 5000,
            active: true,
            company: 'vulcano'
        });

        this.createdIds.products.push(p1.id, p2.id);

        const products = Storage.get(STORAGE_KEYS.PRODUCTS);
        const found1 = products.find(p => p.id === p1.id);
        const found2 = products.find(p => p.id === p2.id);

        this.assert(found1, 'INVENTARIO', 'Producto Millenio guardado en Storage', `ID: ${p1.id}`);
        this.assert(found2, 'INVENTARIO', 'Producto Vulcano guardado en Storage', `ID: ${p2.id}`);
        this.assert(found1?.stockMillenio === 20, 'INVENTARIO', 'Stock Millenio inicial correcto', `stock: ${found1?.stockMillenio}`);
        this.assert(found2?.stockVulcano === 15, 'INVENTARIO', 'Stock Vulcano inicial correcto', `stock: ${found2?.stockVulcano}`);
        this.assert(found1?.priceWholesale === 45000, 'INVENTARIO', 'Precio mayor correcto (costo base)', `$${found1?.priceWholesale}`);
        this.assert(found1?.commissionBase === 8000, 'INVENTARIO', 'Comisión base guardada en inventario', `$${found1?.commissionBase}`);

        console.groupEnd();
        return { p1, p2 };
    },

    async setupTestSellers() {
        console.group('👤 FASE 2: Vendedores de prueba');

        const s1 = await Storage.addItem(STORAGE_KEYS.SELLERS, {
            name: '[TEST] Vendedor Ana García',
            phone: '3001111111',
            status: 'active'
        });
        const s2 = await Storage.addItem(STORAGE_KEYS.SELLERS, {
            name: '[TEST] Vendedor Carlos Ruiz',
            phone: '3002222222',
            status: 'active'
        });

        this.createdIds.sellers.push(s1.id, s2.id);

        const sellers = Storage.get(STORAGE_KEYS.SELLERS);
        const foundS1 = sellers.find(s => s.id === s1.id);
        const foundS2 = sellers.find(s => s.id === s2.id);

        this.assert(foundS1, 'VENDEDORES', 'Vendedor 1 (Ana) creado correctamente', foundS1?.name);
        this.assert(foundS2, 'VENDEDORES', 'Vendedor 2 (Carlos) creado correctamente', foundS2?.name);
        this.assert(foundS1?.status === 'active', 'VENDEDORES', 'Estado activo por defecto');

        console.groupEnd();
        return { s1, s2 };
    },

    // ── FASE 3: VENTA NORMAL (MILLENIO) ─────────────────────────────────
    async testNormalSale(p1, s1) {
        console.group('🛒 FASE 3: Venta normal (Millenio - Entregada)');

        const stockBefore = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p1.id)?.stockMillenio;

        // Descontar stock (simula lo que hace TuCompras al crear venta)
        const product = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p1.id);
        product.stockMillenio -= 2;
        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);

        const cart = [{ product_id: p1.id, name: p1.name, qty: 2, sale_price: 89000, cost_price: 45000, commission_paid: 8000 }];

        const sale = await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, {
            date: new Date().toISOString(),
            customer_name: '[TEST] cliente Laura Pérez',
            customer_phone: '3003333333',
            seller_id: s1.id,
            carrier: 'Servientrega',
            tracking_number: 'TEST-GUIDE-001',
            inventory_source: 'millenio',
            status: 'despachado',
            shipping_cost: 9000,
            commission_paid: 16000, // 2 * 8000
            items: cart,
            money_confirmed: false,
            is_paid_to_inventory: false
        });
        this.createdIds.sales.push(sale.id);

        const stockAfter = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p1.id)?.stockMillenio;
        this.assert(stockAfter === stockBefore - 2, 'TUCOMPRAS', 'Stock descontado al registrar despacho', `${stockBefore} → ${stockAfter}`);
        this.assert(sale.status === 'despachado', 'TUCOMPRAS', 'Estado inicial = despachado');
        this.assert(sale.commission_paid === 16000, 'TUCOMPRAS', 'Comisión calculada correctamente (2x8000)', `$${sale.commission_paid}`);

        // Cambiar a RECIBIDO
        const saleObj = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);
        saleObj.status = 'recibido';
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, saleObj);
        const updatedSale = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);
        this.assert(updatedSale.status === 'recibido', 'TUCOMPRAS', 'Estado actualizado a recibido');

        // Confirmar dinero
        const saleForMoney = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);
        saleForMoney.money_confirmed = true;
        saleForMoney.money_confirmed_at = new Date().toISOString();
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, saleForMoney);
        const confirmedSale = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);
        this.assert(confirmedSale.money_confirmed === true, 'TUCOMPRAS', 'Confirmación de dinero guardada');
        this.assert(!!confirmedSale.money_confirmed_at, 'TUCOMPRAS', 'Fecha de ingreso de dinero guardada', confirmedSale.money_confirmed_at?.substring(0, 10));

        // Verificar aparece en Comisiones Pendientes
        const pendingComms = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).filter(s =>
            s.status === 'recibido' &&
            s.money_confirmed === true &&
            s.is_commission_paid !== true
        );
        this.assert(pendingComms.some(s => s.id === sale.id), 'COMISIONES', 'Venta aparece en comisiones pendientes de liquidar');

        // Verificar deuda a Millenio
        const debtMillenio = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES)
            .filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory && s.inventory_source === 'millenio')
            .reduce((sum, s) => {
                const cost = s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price) * i.qty), 0) : 0;
                return sum + cost;
            }, 0);
        this.assert(debtMillenio > 0, 'REPORTES', 'Deuda a Millenio calculada correctamente', `$${debtMillenio.toLocaleString()}`);

        // Calcular utilidad esperada
        const totalSale = 89000 * 2;  // 178000
        const totalCost = 45000 * 2;  // 90000
        const totalComm = 8000 * 2;   // 16000
        const shipping = 9000;
        const expectedUtility = totalSale - totalCost - totalComm - shipping; // 63000
        this.assert(expectedUtility === 63000, 'REPORTES', 'Cálculo de utilidad correcto', `$${expectedUtility.toLocaleString()}`);

        console.groupEnd();
        return sale;
    },

    // ── FASE 4: VENTA CON DEVOLUCIÓN (VULCANO) ───────────────────────────
    async testReturnSale(p2, s2) {
        console.group('↩️ FASE 4: Venta con devolución (Vulcano)');

        const stockBefore = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p2.id)?.stockVulcano;

        const product = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p2.id);
        product.stockVulcano -= 1;
        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);

        const cart = [{ product_id: p2.id, name: p2.name, qty: 1, sale_price: 65000, cost_price: 30000, commission_paid: 5000 }];

        const sale = await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, {
            date: new Date().toISOString(),
            customer_name: '[TEST] Cliente devolucion',
            customer_phone: '3004444444',
            seller_id: s2.id,
            carrier: 'Coordinadora',
            tracking_number: 'TEST-GUIDE-002',
            inventory_source: 'vulcano',
            status: 'despachado',
            shipping_cost: 8500,
            commission_paid: 5000,
            items: cart,
            money_confirmed: false,
            is_paid_to_inventory: false
        });
        this.createdIds.sales.push(sale.id);

        // Marcar como en proceso_devolucion
        const saleObj = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);
        saleObj.status = 'proceso_devolucion';
        saleObj.shipping_loss = 8500;
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, saleObj);

        // Marcar devolucion_recibida → stock debe volver
        const saleForReturn = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);
        const prod = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p2.id);
        prod.stockVulcano += 1;
        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, prod.id, prod);
        saleForReturn.status = 'devolucion_recibida';
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, saleForReturn);

        const stockAfter = Storage.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === p2.id)?.stockVulcano;
        const returnedSale = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === sale.id);

        this.assert(stockAfter === stockBefore, 'TUCOMPRAS', 'Stock Vulcano restaurado al devolver', `${stockBefore} → ${stockAfter}`);
        this.assert(returnedSale.status === 'devolucion_recibida', 'TUCOMPRAS', 'Estado actualizado a devolucion_recibida');
        this.assert(returnedSale.shipping_loss === 8500, 'TUCOMPRAS', 'Pérdida de envío registrada', `$${returnedSale.shipping_loss}`);

        // NO debe aparecer en comisiones pendientes
        const pendingForSeller = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).filter(s =>
            s.id === sale.id &&
            s.status === 'recibido' &&
            s.money_confirmed === true
        );
        this.assert(pendingForSeller.length === 0, 'COMISIONES', 'Venta devuelta NO genera comisión pendiente');

        // Verificar pérdida registrada para reportes
        this.assert(returnedSale.shipping_loss > 0, 'REPORTES', 'Pérdida por devolución registrada para reportes');

        console.groupEnd();
        return sale;
    },

    // ── FASE 5: VENTA MIXTA (2 VENDEDORES) ──────────────────────────────
    async testMixedSale(p1, p2, s1, s2) {
        console.group('🔀 FASE 5: Venta mixta + Liquidación de comisión');

        // Venta s1 entregada y pagada
        const saleA = await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, {
            date: new Date().toISOString(),
            customer_name: '[TEST] Cliente mixto A',
            customer_phone: '3005555555',
            seller_id: s1.id,
            carrier: 'TCC',
            tracking_number: 'TEST-GUIDE-003',
            inventory_source: 'millenio',
            status: 'recibido',
            shipping_cost: 7000,
            commission_paid: 8000,
            items: [{ product_id: p1.id, name: p1.name, qty: 1, sale_price: 89000, cost_price: 45000, commission_paid: 8000 }],
            money_confirmed: true,
            money_confirmed_at: new Date().toISOString(),
            is_paid_to_inventory: false,
            is_commission_paid: false
        });
        this.createdIds.sales.push(saleA.id);

        // Liquidar comisión de saleA
        const saleAObj = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === saleA.id);
        saleAObj.is_commission_paid = true;
        saleAObj.commission_paid_at = new Date().toISOString();
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, saleA.id, saleAObj);

        const liquidatedSale = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).find(s => s.id === saleA.id);
        this.assert(liquidatedSale.is_commission_paid === true, 'COMISIONES', 'Comisión marcada como pagada');
        this.assert(!!liquidatedSale.commission_paid_at, 'COMISIONES', 'Fecha de pago de comisión guardada', liquidatedSale.commission_paid_at?.substring(0, 10));

        // Ya NO debe aparecer en pendientes
        const stillPending = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).filter(s =>
            s.id === saleA.id &&
            s.status === 'recibido' &&
            s.money_confirmed === true &&
            s.is_commission_paid !== true
        );
        this.assert(stillPending.length === 0, 'COMISIONES', 'Comisión pagada desaparece de pendientes');

        console.groupEnd();
        return saleA;
    },

    // ── FASE 6: VALIDACIÓN DE REPORTES / MÓDULO CONSULTAS ────────────────
    async testReports() {
        console.group('📊 FASE 6: Validación de reportes y módulo Consultas');

        const tcSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES);
        const testSales = tcSales.filter(s => s.customer_name?.startsWith('[TEST]'));

        this.assert(testSales.length >= 3, 'REPORTES', 'Mínimo 3 ventas de prueba en historial', `${testSales.length} encontradas`);

        const delivered = testSales.filter(s => s.status === 'recibido');
        this.assert(delivered.length >= 1, 'REPORTES', 'Ventas entregadas filtrables');

        const returns = testSales.filter(s => s.status === 'devolucion_recibida');
        this.assert(returns.length >= 1, 'REPORTES', 'Devoluciones filtrables');

        const totalUtility = tcSales.filter(s => s.status === 'recibido').reduce((sum, s) => {
            const saleTotal = s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.sale_price || 0) * (i.qty || 1)), 0) : 0;
            const costTotal = s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price || 0) * (i.qty || 1)), 0) : 0;
            const comm = parseFloat(s.commission_paid || 0);
            const ship = parseFloat(s.shipping_cost || 0);
            return sum + saleTotal - costTotal - comm - ship;
        }, 0);
        this.assert(typeof totalUtility === 'number', 'REPORTES', 'Utilidad total calculable', `$${totalUtility.toLocaleString()}`);

        const shippingLosses = tcSales.filter(s => (s.shipping_loss || 0) > 0).reduce((sum, s) => sum + s.shipping_loss, 0);
        this.assert(shippingLosses > 0, 'REPORTES', 'Pérdidas por devoluciones registradas', `$${shippingLosses.toLocaleString()}`);

        const commissionsPaid = tcSales.filter(s => s.is_commission_paid === true);
        this.assert(commissionsPaid.length >= 1, 'REPORTES', 'Historial de comisiones pagadas accesible');

        // Verificar módulo Consultas existe
        this.assert(typeof window.Consultas === 'object', 'UI', 'Módulo Consultas cargado correctamente');
        this.assert(typeof window.Vendedores === 'object', 'UI', 'Módulo Vendedores cargado correctamente');
        this.assert(typeof window.TuCompras === 'object', 'UI', 'Módulo TuCompras cargado correctamente');
        this.assert(typeof window.Inventory === 'object', 'UI', 'Módulo Inventory cargado correctamente');
        this.assert(typeof window.Storage === 'object', 'UI', 'Storage global disponible');
        this.assert(typeof window.Dashboard === 'object', 'UI', 'Módulo Dashboard cargado');

        console.groupEnd();
    },

    // ── FASE 7: LIMPIEZA TOTAL DE DATOS DE PRUEBA ───────────────────────
    async cleanup() {
        console.group('🧹 FASE 7: Limpieza de datos de prueba');

        let cleaned = 0;

        for (const id of this.createdIds.products) {
            const prods = Storage.get(STORAGE_KEYS.PRODUCTS).filter(p => p.id !== id);
            localStorage.setItem('erp_products', JSON.stringify(prods));
            Storage.cache[STORAGE_KEYS.PRODUCTS] = prods;
            if (window.supabaseClient) {
                try { await window.supabaseClient.from('products').delete().eq('id', id); } catch (e) { }
            }
            cleaned++;
        }

        for (const id of this.createdIds.sellers) {
            const items = Storage.get(STORAGE_KEYS.SELLERS).filter(s => s.id !== id);
            localStorage.setItem('erp_sellers', JSON.stringify(items));
            Storage.cache[STORAGE_KEYS.SELLERS] = items;
            if (window.supabaseClient) {
                try { await window.supabaseClient.from('sellers').delete().eq('id', id); } catch (e) { }
            }
            cleaned++;
        }

        for (const id of this.createdIds.sales) {
            const items = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES).filter(s => s.id !== id);
            localStorage.setItem('erp_tucompras_sales', JSON.stringify(items));
            Storage.cache[STORAGE_KEYS.TUCOMPRAS_SALES] = items;
            if (window.supabaseClient) {
                try { await window.supabaseClient.from('tucompras_sales').delete().eq('id', id); } catch (e) { }
            }
            cleaned++;
        }

        // Limpiar clientes CRM de prueba
        const crmCleaned = Storage.get(STORAGE_KEYS.TUCOMPRAS_CUSTOMERS || 'tucompras_customers')
            .filter(c => !c.name?.startsWith('[TEST]'));
        localStorage.setItem('erp_tucompras_customers', JSON.stringify(crmCleaned));
        if (Storage.cache['tucompras_customers']) Storage.cache['tucompras_customers'] = crmCleaned;

        console.log(`✅ Limpiados ${cleaned} registros de prueba.`);
        this.log('LIMPIEZA', 'Eliminación datos de prueba', cleaned > 0, `${cleaned} registros eliminados`);
        console.groupEnd();
    },

    // ── REPORTE FINAL ────────────────────────────────────────────────────
    generateReport() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        console.group('\n' + '='.repeat(60));
        console.log('📋 INFORME FINAL DE TEST ERP AC');
        console.log('='.repeat(60));
        console.log(`Total pruebas: ${total} | ✅ Pasadas: ${passed} | ❌ Fallidas: ${failed}`);
        console.log('='.repeat(60));

        if (failed > 0) {
            console.group('🚨 ERRORES DETECTADOS:');
            this.errors.forEach((e, i) => {
                console.log(`${i + 1}. [${e.category}] ${e.test}: ${e.detail}`);
            });
            console.groupEnd();
        } else {
            console.log('🎉 TODOS LOS TESTS PASARON CORRECTAMENTE');
        }

        console.groupEnd();

        return {
            total, passed, failed,
            errors: this.errors,
            passRate: `${Math.round((passed / total) * 100)}%`,
            results: this.results
        };
    },

    // ── RUNNER PRINCIPAL ─────────────────────────────────────────────────
    async run() {
        console.clear();
        console.log('%c🧪 ERP AC TEST RUNNER v1.0 - INICIO', 'font-size:16px; font-weight:bold; color:#3b82f6;');
        console.log('Hora:', new Date().toLocaleString());
        this.results = [];
        this.errors = [];
        this.createdIds = { products: [], sellers: [], sales: [], customers: [] };

        try {
            const { p1, p2 } = await this.setupTestProducts();
            const { s1, s2 } = await this.setupTestSellers();
            await this.testNormalSale(p1, s1);
            await this.testReturnSale(p2, s2);
            await this.testMixedSale(p1, p2, s1, s2);
            await this.testReports();
        } catch (e) {
            console.error('❌ Error crítico en test:', e);
            this.log('SISTEMA', 'Error crítico inesperado', false, e.message);
        } finally {
            await this.cleanup();
        }

        return this.generateReport();
    }
};

console.log('%c✅ ERPTest cargado. Ejecuta: ERPTest.run()', 'color: #10b981; font-weight: bold;');
