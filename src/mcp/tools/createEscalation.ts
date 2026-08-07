import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createEscalation } from '../../data/escalations.js';
import { diagnoseStuckOrder } from '../../domain/diagnose.js';

export function registerCreateEscalationTool(server: McpServer): void {
  server.tool(
    'createEscalation',
    'Create a human-review escalation for a stuck order with supporting evidence and a recommended action. This does NOT take any automated action on the order — it only creates a record for a human to review and act on.',
    {
      orderId: z.string().describe('The ID of the stuck order to escalate.'),
      evidence: z.record(z.unknown()).describe('Supporting evidence object explaining the issue.'),
      recommendedAction: z.string().describe('The recommended action for human review.'),
      diagnosis: z.string().optional().describe('Diagnosis from a prior diagnoseStuckOrder call. Recommended to supply.'),
      rootCause: z.string().optional().describe('Root cause from a prior diagnoseStuckOrder call, if any.')
    },
    async ({ orderId, evidence, recommendedAction, diagnosis: callerDiagnosis, rootCause: callerRootCause }) => {
      let diagnosisValue: string;
      let rootCauseValue: string | undefined | null;

      if (callerDiagnosis !== undefined) {
        diagnosisValue = callerDiagnosis;
        rootCauseValue = callerRootCause ?? null;
      } else {
        const diag = diagnoseStuckOrder(orderId);
        diagnosisValue = diag.diagnosis;
        rootCauseValue = diag.rootCause;
      }

      const result = await createEscalation(
        orderId,
        diagnosisValue,
        rootCauseValue,
        evidence,
        recommendedAction
      );

      const responsePayload = {
        escalationId: result.escalation.id,
        orderId: result.escalation.order_id,
        recommendedAction: result.escalation.recommended_action,
        status: result.status
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responsePayload, null, 2)
          }
        ]
      };
    }
  );
}
