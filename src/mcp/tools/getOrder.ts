import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getOrderById } from '../../data/store.js';

export function registerGetOrderTool(server: McpServer): void {
  server.tool(
    'getOrder',
    'Retrieve the current state of an order by its ID, including status and timestamps.',
    {
      orderId: z.string().describe('The ID of the order to retrieve.')
    },
    async ({ orderId }) => {
      const order = getOrderById(orderId);
      if (!order) {
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
            text: JSON.stringify(order, null, 2)
          }
        ]
      };
    }
  );
}
