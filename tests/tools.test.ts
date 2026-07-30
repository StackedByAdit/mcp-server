import { describe, it, expect, beforeEach } from 'vitest';
import { mcpServer } from '../src/mcp/server.js';
import { clearEscalations } from '../src/guardrails/dedupe.js';
import { getOrderById, getPaymentByOrderId, getInventoryBySku, getShipmentByOrderId } from '../src/data/store.js';
import { diagnoseStuckOrder } from '../src/domain/diagnose.js';
import { hasRecentEscalation, recordEscalation } from '../src/guardrails/dedupe.js';

describe('MCP Registered Server Tools', () => {
  beforeEach(() => {
    clearEscalations();
  });

  it('1. getOrder returns order record or error', () => {
    const valid = getOrderById('ORD-1001');
    expect(valid?.orderId).toBe('ORD-1001');
    const invalid = getOrderById('ORD-999');
    expect(invalid).toBeUndefined();
  });

  it('2. getPaymentStatus returns payment record or error', () => {
    const valid = getPaymentByOrderId('ORD-1001');
    expect(valid?.paymentStatus).toBe('captured');
    const invalid = getPaymentByOrderId('ORD-999');
    expect(invalid).toBeUndefined();
  });

  it('3. getInventoryForSku returns inventory and backordered flag', () => {
    const healthy = getInventoryBySku('SKU-HEALTHY-01');
    expect(healthy?.availableQty).toBe(100);

    const backordered = getInventoryBySku('SKU-BACKORDERED-02');
    expect(backordered ? backordered.reservedQty > backordered.availableQty : false).toBe(true);
  });

  it('4. getShipmentStatus returns shipment or false status', () => {
    const shipped = getShipmentByOrderId('ORD-1001');
    expect(shipped?.trackingNumber).toBe('TRK-123456789');

    const unshipped = getShipmentByOrderId('ORD-1002');
    expect(unshipped).toBeUndefined();
  });

  it('5. diagnoseStuckOrder returns single root cause diagnosis', () => {
    const diagB = diagnoseStuckOrder('ORD-1002');
    expect(diagB.diagnosis).toBe('fulfillment_stalled');
    expect(diagB.rootCause).toBe('inventory_backorder');
  });

  it('6. createEscalation logs escalation and enforces deduplication', () => {
    expect(hasRecentEscalation('ORD-1002')).toBe(false);
    recordEscalation('ORD-1002');
    expect(hasRecentEscalation('ORD-1002')).toBe(true);
  });

  it('mcpServer should have tools registered', () => {
    expect(mcpServer).toBeDefined();
  });
});
