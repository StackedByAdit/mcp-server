import { pool } from './db.js';

export interface Escalation {
  id: string;
  order_id: string;
  diagnosis: string;
  root_cause: string | null;
  evidence: Record<string, unknown>;
  recommended_action: string;
  status: 'open' | 'resolved';
  created_at: Date | string;
}

export type CreateEscalationResult =
  | { status: 'created'; escalation: Escalation }
  | { status: 'already_escalated'; escalation: Escalation };

export async function createEscalation(
  orderId: string,
  diagnosis: string,
  rootCause: string | undefined | null,
  evidence: Record<string, unknown>,
  recommendedAction: string
): Promise<CreateEscalationResult> {
  try {
    const insertQuery = `
      INSERT INTO escalations (order_id, diagnosis, root_cause, evidence, recommended_action)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, order_id, diagnosis, root_cause, evidence, recommended_action, status, created_at;
    `;
    const res = await pool.query(insertQuery, [
      orderId,
      diagnosis,
      rootCause ?? null,
      JSON.stringify(evidence),
      recommendedAction
    ]);
    return {
      status: 'created',
      escalation: res.rows[0]
    };
  } catch (error: any) {
    // Postgres error code 23505 is unique_violation
    if (error?.code === '23505') {
      const selectQuery = `
        SELECT id, order_id, diagnosis, root_cause, evidence, recommended_action, status, created_at
        FROM escalations
        WHERE order_id = $1 AND status = 'open'
        LIMIT 1;
      `;
      const res = await pool.query(selectQuery, [orderId]);
      return {
        status: 'already_escalated',
        escalation: res.rows[0]
      };
    }
    throw error;
  }
}
