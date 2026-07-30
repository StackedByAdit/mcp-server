import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { registerGetOrderTool } from './tools/getOrder.js';
import { registerGetPaymentStatusTool } from './tools/getPaymentStatus.js';
import { registerGetInventoryForSkuTool } from './tools/getInventoryForSku.js';
import { registerGetShipmentStatusTool } from './tools/getShipmentStatus.js';
import { registerDiagnoseStuckOrderTool } from './tools/diagnoseStuckOrder.js';
import { registerCreateEscalationTool } from './tools/createEscalation.js';

export const mcpServer = new McpServer({
  name: 'order-investigation-mcp',
  version: '1.0.0'
});

// Register all 6 tools
registerGetOrderTool(mcpServer);
registerGetPaymentStatusTool(mcpServer);
registerGetInventoryForSkuTool(mcpServer);
registerGetShipmentStatusTool(mcpServer);
registerDiagnoseStuckOrderTool(mcpServer);
registerCreateEscalationTool(mcpServer);

export const app = express();

const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);
  req.on('close', () => {
    transports.delete(transport.sessionId);
  });
  await mcpServer.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('Session not found');
  }
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MCP server listening on port ${PORT}`);
  });
}
