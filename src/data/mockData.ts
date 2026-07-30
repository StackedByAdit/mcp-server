export interface Order {
  orderId: string;
  sku: string;
  status: string;
  createdAt: string;
  paymentStatus: 'captured' | 'pending' | 'failed';
  fulfillmentTriggeredAt: string | null;
  fulfillmentJobStatus: 'ok' | 'failed' | 'not_started';
}

export interface InventoryRecord {
  sku: string;
  availableQty: number;
  reservedQty: number;
}

export interface ShipmentRecord {
  orderId: string;
  shipmentId: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: string;
}

export const mockOrders: Order[] = [
  {
    orderId: 'ORD-1001',
    sku: 'SKU-HEALTHY-01',
    status: 'fulfilled',
    createdAt: '2026-07-30T09:00:00Z',
    paymentStatus: 'captured',
    fulfillmentTriggeredAt: '2026-07-30T09:05:00Z',
    fulfillmentJobStatus: 'ok'
  },
  {
    orderId: 'ORD-1002',
    sku: 'SKU-BACKORDERED-02',
    status: 'stalled',
    createdAt: '2026-07-30T10:00:00Z',
    paymentStatus: 'captured',
    fulfillmentTriggeredAt: null,
    fulfillmentJobStatus: 'not_started'
  },
  {
    orderId: 'ORD-1003',
    sku: 'SKU-AVAILABLE-03',
    status: 'stalled',
    createdAt: '2026-07-30T11:00:00Z',
    paymentStatus: 'captured',
    fulfillmentTriggeredAt: null,
    fulfillmentJobStatus: 'failed'
  },
  {
    orderId: 'ORD-1004',
    sku: 'SKU-AVAILABLE-04',
    status: 'pending_payment',
    createdAt: '2026-07-30T12:00:00Z',
    paymentStatus: 'pending',
    fulfillmentTriggeredAt: null,
    fulfillmentJobStatus: 'not_started'
  }
];

export const mockInventory: InventoryRecord[] = [
  {
    sku: 'SKU-HEALTHY-01',
    availableQty: 100,
    reservedQty: 5
  },
  {
    sku: 'SKU-BACKORDERED-02',
    availableQty: 0,
    reservedQty: 10
  },
  {
    sku: 'SKU-AVAILABLE-03',
    availableQty: 50,
    reservedQty: 2
  },
  {
    sku: 'SKU-AVAILABLE-04',
    availableQty: 30,
    reservedQty: 1
  }
];

export const mockShipments: ShipmentRecord[] = [
  {
    orderId: 'ORD-1001',
    shipmentId: 'SHIP-9001',
    carrier: 'FedEx',
    trackingNumber: 'TRK-123456789',
    shippedAt: '2026-07-30T09:30:00Z'
  }
];
