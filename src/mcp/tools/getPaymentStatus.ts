import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPaymentByOrderId } from '../../data/store.js';

export function registerGetPaymentStatusTool(server: McpServer): void {
  server.tool(
    'getPaymentStatus',
    'Check whether payment for an order has been captured, is pending, or failed.',
    {
      orderId: z.string().describe('The ID of the order to check payment status for.')
    },
    async ({ orderId }) => {
      const payment = getPaymentByOrderId(orderId);
      if (!payment) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'order_not_found', message: `Order ${orderId} was not found.` })
            }
          ]
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payment, null, 2)
          }
        ]
      };
    }
  );
}
