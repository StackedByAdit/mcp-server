import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { diagnoseStuckOrder } from '../../domain/diagnose.js';

export function registerDiagnoseStuckOrderTool(server: McpServer): void {
  server.tool(
    'diagnoseStuckOrder',
    'Investigate why an order may be stuck by checking payment status first, then fulfillment status, then inventory as a contributing factor. Returns a single root-cause diagnosis, not multiple competing causes.',
    {
      orderId: z.string().describe('The ID of the order to diagnose.')
    },
    async ({ orderId }) => {
      const result = diagnoseStuckOrder(orderId);
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
