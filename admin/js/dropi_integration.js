/**
 * ERP AC - Dropi API Schema Mapping & Readiness Helper
 * Preparado para la futura integración directa por API con Dropi.
 */
const DropiSchema = {
    statusMap: {
        'PENDIENTE': 'despachado',
        'PREPARACION': 'despachado',
        'ENVIADO': 'despachado',
        'ENTREGADO': 'recibido',
        'DEVOLUCION': 'proceso_devolucion',
        'DEVOLUCION_RECIBIDA': 'devolucion_recibida',
        'CANCELADO': 'cancelado'
    },

    mapDropiToSale(dropiOrder) {
        if (!dropiOrder) return null;
        return {
            id: 'TC-DR-' + (dropiOrder.id || dropiOrder.order_id),
            dropi_order_id: dropiOrder.id || dropiOrder.order_id,
            date: dropiOrder.created_at || new Date().toISOString(),
            carrier: dropiOrder.transportadora || dropiOrder.shipping_company || 'Dropi',
            tracking_number: dropiOrder.guia || dropiOrder.tracking_number || '',
            customer_name: dropiOrder.nombre_cliente || dropiOrder.customer_name || 'Cliente Dropi',
            customer_phone: dropiOrder.telefono || dropiOrder.customer_phone || '',
            customer_city: dropiOrder.ciudad || dropiOrder.customer_city || '',
            customer_address: dropiOrder.direccion || dropiOrder.customer_address || '',
            sale_price: parseFloat(dropiOrder.total || dropiOrder.sale_price) || 0,
            shipping_cost: parseFloat(dropiOrder.flete || dropiOrder.shipping_cost) || 0,
            shipping_loss: parseFloat(dropiOrder.flete_devolucion || dropiOrder.shipping_loss) || 0,
            status: this.statusMap[dropiOrder.status] || 'despachado',
            dropi_status: dropiOrder.status,
            dropi_wallet_movement_id: dropiOrder.wallet_movement_id || null,
            dropi_tracking_url: dropiOrder.tracking_url || null,
            items: (dropiOrder.productos || dropiOrder.items || []).map(item => ({
                product_id: item.product_id || item.sku || 'TC-PROD-DROPI',
                name: item.name || item.nombre_producto || 'Producto Dropi',
                qty: parseInt(item.cantidad || item.qty) || 1,
                cost_price: parseFloat(item.costo || item.cost_price) || 0,
                sale_price: parseFloat(item.precio_venta || item.sale_price) || 0,
                commission_paid: parseFloat(item.comision || item.commission_paid) || 0
            })),
            money_confirmed: dropiOrder.status === 'ENTREGADO' && !!dropiOrder.wallet_confirmed,
            is_commission_paid: false,
            inventory_source: dropiOrder.origen_inventario || 'millenio'
        };
    }
};

if (typeof window !== 'undefined') {
    window.DropiSchema = DropiSchema;
}
