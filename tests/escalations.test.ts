import 'dotenv/config';
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { createEscalation } from '../src/data/escalations.js';
import { pool } from '../src/data/db.js';

describe('Postgres Escalation Storage & Idempotency', () => {
  const testOrderId = 'TEST-ORD-9999';

  const cleanupTestData = async () => {
    await pool.query('DELETE FROM escalations WHERE order_id = $1', [testOrderId]);
  };

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await pool.end();
  });

  it('Test 1: should return status "created" when escalating a fresh order', async () => {
    const result = await createEscalation(
      testOrderId,
      'fulfillment_stalled',
      'inventory_backorder',
      { availableQty: 0, reservedQty: 5 },
      'Restock SKU and re-trigger fulfillment.'
    );

    expect(result.status).toBe('created');
    expect(result.escalation).toBeDefined();
    expect(result.escalation.order_id).toBe(testOrderId);
    expect(result.escalation.status).toBe('open');
  });

  it('Test 2: should return status "already_escalated" on duplicate open escalation and not create a second row', async () => {
    const firstResult = await createEscalation(
      testOrderId,
      'fulfillment_stalled',
      'inventory_backorder',
      { availableQty: 0, reservedQty: 5 },
      'Restock SKU and re-trigger fulfillment.'
    );
    expect(firstResult.status).toBe('created');

    const secondResult = await createEscalation(
      testOrderId,
      'fulfillment_stalled',
      'inventory_backorder',
      { availableQty: 0, reservedQty: 5 },
      'Duplicate request - restock SKU.'
    );

    expect(secondResult.status).toBe('already_escalated');
    expect(secondResult.escalation.id).toBe(firstResult.escalation.id);

    const countRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM escalations WHERE order_id = $1 AND status = $2',
      [testOrderId, 'open']
    );
    expect(countRes.rows[0].count).toBe(1);
  });
});
