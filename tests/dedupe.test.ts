import { describe, it, expect, beforeEach } from 'vitest';
import { hasRecentEscalation, recordEscalation, clearEscalations } from '../src/guardrails/dedupe.js';

describe('Escalation Deduplication Guardrail', () => {
  beforeEach(() => {
    clearEscalations();
  });

  it('should return false when no escalation has been recorded for an order', () => {
    expect(hasRecentEscalation('ORD-1001')).toBe(false);
  });

  it('should return true immediately after recording an escalation', () => {
    recordEscalation('ORD-1001');
    expect(hasRecentEscalation('ORD-1001')).toBe(true);
  });

  it('should differentiate between different order IDs', () => {
    recordEscalation('ORD-1001');
    expect(hasRecentEscalation('ORD-1001')).toBe(true);
    expect(hasRecentEscalation('ORD-1002')).toBe(false);
  });

  it('should return false if the escalation is older than the window windowMs', async () => {
    recordEscalation('ORD-1001');
    // Test with a 50ms custom window after waiting 60ms
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(hasRecentEscalation('ORD-1001', 50)).toBe(false);
  });
});
