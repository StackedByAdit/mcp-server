import { mockOrders, mockInventory, mockShipments, Order, InventoryRecord, ShipmentRecord } from './mockData.js';

export interface Escalation {
  escalationId: string;
  orderId: string;
  evidence: Record<string, unknown>;
  recommendedAction: string;
  createdAt: string;
}

export const mockEscalations: Escalation[] = [];

export function getOrderById(orderId: string): Order | undefined {
  return mockOrders.find((o) => o.orderId === orderId);
}

export function getPaymentByOrderId(orderId: string): { orderId: string; paymentStatus: Order['paymentStatus'] } | undefined {
  const order = getOrderById(orderId);
  if (!order) return undefined;
  return {
    orderId: order.orderId,
    paymentStatus: order.paymentStatus
  };
}

export function getInventoryBySku(sku: string): InventoryRecord | undefined {
  return mockInventory.find((i) => i.sku === sku);
}

export function getShipmentByOrderId(orderId: string): ShipmentRecord | undefined {
  return mockShipments.find((s) => s.orderId === orderId);
}

export function saveEscalation(escalation: Escalation): void {
  mockEscalations.push(escalation);
}

export function getEscalations(): Escalation[] {
  return mockEscalations;
}
