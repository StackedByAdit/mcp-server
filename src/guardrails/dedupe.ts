export interface EscalationRecord {
  orderId: string;
  createdAt: Date;
}

const escalationLog: EscalationRecord[] = [];

const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Checks if an escalation for the given orderId was created within the last windowMs (default 10 mins).
 */
export function hasRecentEscalation(orderId: string, windowMs: number = DEFAULT_WINDOW_MS): boolean {
  const now = Date.now();
  return escalationLog.some(
    (record) => record.orderId === orderId && now - record.createdAt.getTime() < windowMs
  );
}

/**
 * Records a new escalation timestamp for the given orderId.
 */
export function recordEscalation(orderId: string): void {
  escalationLog.push({
    orderId,
    createdAt: new Date()
  });
}

/**
 * Clears recorded escalations (primarily for test cleanup).
 */
export function clearEscalations(): void {
  escalationLog.length = 0;
}
