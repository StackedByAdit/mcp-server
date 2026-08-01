import { getOrderById, getInventoryBySku } from '../data/store.js';

export interface InventorySnapshot {
  availableQty: number;
  reservedQty: number;
  isBackordered: boolean;
}

export interface Evidence {
  paymentStatus?: string;
  fulfillmentTriggeredAt?: string | null;
  fulfillmentJobStatus?: string;
  inventorySnapshot?: InventorySnapshot;
}

export interface DiagnosisResult {
  orderId: string;
  diagnosis: 'not_found' | 'payment_not_captured' | 'healthy' | 'fulfillment_stalled';
  rootCause?: 'inventory_backorder' | 'fulfillment_job_failure';
  explanation: string;
  evidence?: Evidence;
}

export function diagnoseStuckOrder(orderId: string): DiagnosisResult {
  const order = getOrderById(orderId);
  if (!order) {
    return {
      orderId,
      diagnosis: 'not_found',
      explanation: `Order ${orderId} was not found.`
    };
  }

  if (order.paymentStatus !== 'captured') {
    return {
      orderId,
      diagnosis: 'payment_not_captured',
      explanation: `Payment status is ${order.paymentStatus}. Fulfillment cannot be triggered until payment is captured.`,
      evidence: {
        paymentStatus: order.paymentStatus,
        fulfillmentTriggeredAt: order.fulfillmentTriggeredAt
      }
    };
  }

  if (order.fulfillmentTriggeredAt !== null) {
    return {
      orderId,
      diagnosis: 'healthy',
      explanation: `Order ${orderId} is healthy; payment is captured and fulfillment was triggered at ${order.fulfillmentTriggeredAt}.`,
      evidence: {
        paymentStatus: order.paymentStatus,
        fulfillmentTriggeredAt: order.fulfillmentTriggeredAt,
        fulfillmentJobStatus: order.fulfillmentJobStatus
      }
    };
  }

  const inventory = getInventoryBySku(order.sku);
  const isBackordered = inventory ? inventory.reservedQty > inventory.availableQty : false;

  const inventorySnapshot: InventorySnapshot | undefined = inventory
    ? {
        availableQty: inventory.availableQty,
        reservedQty: inventory.reservedQty,
        isBackordered
      }
    : undefined;

  if (isBackordered) {
    return {
      orderId,
      diagnosis: 'fulfillment_stalled',
      rootCause: 'inventory_backorder',
      explanation: `Fulfillment has not started because SKU ${order.sku} is backordered (reserved: ${inventory?.reservedQty}, available: ${inventory?.availableQty}).`,
      evidence: {
        paymentStatus: order.paymentStatus,
        fulfillmentTriggeredAt: order.fulfillmentTriggeredAt,
        fulfillmentJobStatus: order.fulfillmentJobStatus,
        inventorySnapshot
      }
    };
  }

  return {
    orderId,
    diagnosis: 'fulfillment_stalled',
    rootCause: 'fulfillment_job_failure',
    explanation: `Fulfillment has not started despite available inventory (reserved: ${inventory?.reservedQty}, available: ${inventory?.availableQty}) — likely an independent fulfillment job failure, unrelated to stock.`,
    evidence: {
      paymentStatus: order.paymentStatus,
      fulfillmentTriggeredAt: order.fulfillmentTriggeredAt,
      fulfillmentJobStatus: order.fulfillmentJobStatus,
      inventorySnapshot
    }
  };
}
