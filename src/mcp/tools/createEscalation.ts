import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createEscalation as createPostgresEscalation } from '../../data/escalations.js';
import { diagnoseStuckOrder } from '../../domain/diagnose.js';

export function registerCreateEscalationTool(server: McpServer): void {
  server.tool(
    'createEscalation',
    'Create a human-review escalation for a stuck order with supporting evidence and a recommended action. This does NOT take any automated action on the order — it only creates a record for a human to review and act on.',
    {
      orderId: z.string().describe('The ID of the stuck order to escalate.'),
      diagnosis: z.string().optional().describe('Optional diagnosis string if known.'),
      rootCause: z.string().optional().describe('Optional root cause string if known.'),
      evidence: z.record(z.unknown()).describe('Supporting evidence object explaining the issue.'),
      recommendedAction: z.string().describe('The recommended action for human review.')
    },
    async ({ orderId, diagnosis, rootCause, evidence, recommendedAction }) => {
      const diag = diagnoseStuckOrder(orderId);
      const finalDiagnosis = diagnosis ?? diag.diagnosis;
      const finalRootCause = rootCause ?? diag.rootCause;

      const result = await createPostgresEscalation(
        orderId,
        finalDiagnosis,
        finalRootCause,
        evidence,
        recommendedAction
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
}
