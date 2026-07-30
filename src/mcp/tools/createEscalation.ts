import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { hasRecentEscalation, recordEscalation } from '../../guardrails/dedupe.js';
import { saveEscalation } from '../../data/store.js';

export function registerCreateEscalationTool(server: McpServer): void {
  server.tool(
    'createEscalation',
    'Create a human-review escalation for a stuck order with supporting evidence and a recommended action. This does NOT take any automated action on the order — it only creates a record for a human to review and act on.',
    {
      orderId: z.string().describe('The ID of the stuck order to escalate.'),
      evidence: z.record(z.unknown()).describe('Supporting evidence object explaining the issue.'),
      recommendedAction: z.string().describe('The recommended action for human review.')
    },
    async ({ orderId, evidence, recommendedAction }) => {
      if (hasRecentEscalation(orderId)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'duplicate_prevented',
                message: `An escalation for order ${orderId} was created recently. Skipping duplicate creation.`,
                orderId
              })
            }
          ]
        };
      }

      recordEscalation(orderId);
      const escalationId = `ESC-${Date.now()}`;
      const createdAt = new Date().toISOString();

      saveEscalation({
        escalationId,
        orderId,
        evidence,
        recommendedAction,
        createdAt
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                escalationId,
                orderId,
                recommendedAction,
                status: 'created',
                createdAt
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
