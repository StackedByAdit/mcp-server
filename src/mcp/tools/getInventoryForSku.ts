import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getInventoryBySku } from '../../data/store.js';

export function registerGetInventoryForSkuTool(server: McpServer): void {
  server.tool(
    'getInventoryForSku',
    'Check available and reserved stock for a SKU to determine if it is backordered.',
    {
      sku: z.string().describe('The SKU code to check inventory for.')
    },
    async ({ sku }) => {
      const inventory = getInventoryBySku(sku);
      if (!inventory) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'sku_not_found', message: `SKU ${sku} was not found.` })
            }
          ]
        };
      }
      const isBackordered = inventory.reservedQty > inventory.availableQty;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...inventory,
                isBackordered
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
