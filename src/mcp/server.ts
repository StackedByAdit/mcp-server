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

app.use(express.json());

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Active SSE transports mapped by sessionId
const transports = new Map<string, SSEServerTransport>();

// Streamable HTTP / SSE endpoint
app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);

  req.on('close', () => {
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// Message endpoint for SSE client communication
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('Session not found');
  }
});
