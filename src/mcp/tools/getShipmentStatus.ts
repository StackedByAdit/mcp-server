import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getShipmentByOrderId } from '../../data/store.js';

export function registerGetShipmentStatusTool(server: McpServer): void {
  server.tool(
    'getShipmentStatus',
    'Check whether a shipment has been created for an order.',
    {
      orderId: z.string().describe('The ID of the order to check shipment for.')
    },
    async ({ orderId }) => {
      const shipment = getShipmentByOrderId(orderId);
      if (!shipment) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                orderId,
                hasShipment: false,
                message: `No shipment created for order ${orderId}.`
              })
            }
          ]
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                orderId,
                hasShipment: true,
                shipment
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
