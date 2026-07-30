import { describe, it, expect, beforeEach } from 'vitest';
import { hasRecentEscalation, recordEscalation, clearEscalations } from '../src/guardrails/dedupe.js';

describe('Escalation Deduplication Guardrail', () => {
  beforeEach(() => {
    clearEscalations();
  });

  it('should return false before recording, and true after recording an escalation within the time window', () => {
    const orderId = 'ORD-1002';
    expect(hasRecentEscalation(orderId)).toBe(false);

    recordEscalation(orderId);
    expect(hasRecentEscalation(orderId)).toBe(true);
  });

  it('should confirm deduplication blocks a second escalation attempt for the same order', () => {
    const orderId = 'ORD-1003';

    // First escalation attempt allowed
    expect(hasRecentEscalation(orderId)).toBe(false);
    recordEscalation(orderId);

    // Second escalation attempt blocked
    const isBlockedOnSecondAttempt = hasRecentEscalation(orderId);
    expect(isBlockedOnSecondAttempt).toBe(true);
  });
});
