import { describe, it, expect } from 'vitest';
import { diagnoseStuckOrder } from '../src/domain/diagnose.js';

describe('diagnoseStuckOrder', () => {
  it('should return not_found for non-existent order', () => {
    const result = diagnoseStuckOrder('ORD-UNKNOWN');
    expect(result.diagnosis).toBe('not_found');
    expect(result.explanation).toContain('not found');
  });

  it('should diagnose Order A (ORD-1001) as healthy', () => {
    const result = diagnoseStuckOrder('ORD-1001');
    expect(result.diagnosis).toBe('healthy');
    expect(result.rootCause).toBeUndefined();
    expect(result.evidence?.paymentStatus).toBe('captured');
    expect(result.evidence?.fulfillmentTriggeredAt).toBe('2026-07-30T09:05:00Z');
  });

  it('should diagnose Order B (ORD-1002) as fulfillment_stalled due to inventory_backorder', () => {
    const result = diagnoseStuckOrder('ORD-1002');
    expect(result.diagnosis).toBe('fulfillment_stalled');
    expect(result.rootCause).toBe('inventory_backorder');
    expect(result.evidence?.inventorySnapshot?.isBackordered).toBe(true);
  });

  it('should diagnose Order C (ORD-1003) as fulfillment_stalled due to fulfillment_job_failure', () => {
    const result = diagnoseStuckOrder('ORD-1003');
    expect(result.diagnosis).toBe('fulfillment_stalled');
    expect(result.rootCause).toBe('fulfillment_job_failure');
    expect(result.evidence?.inventorySnapshot?.isBackordered).toBe(false);
  });

  it('should diagnose Order D (ORD-1004) as payment_not_captured', () => {
    const result = diagnoseStuckOrder('ORD-1004');
    expect(result.diagnosis).toBe('payment_not_captured');
    expect(result.rootCause).toBeUndefined();
    expect(result.evidence?.paymentStatus).toBe('pending');
    expect(result.evidence?.inventorySnapshot).toBeUndefined();
  });
});
