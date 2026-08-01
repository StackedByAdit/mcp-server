import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { registerGetOrderTool } from './tools/getOrder.js';
import { registerGetPaymentStatusTool } from './tools/getPaymentStatus.js';
import { registerGetInventoryForSkuTool } from './tools/getInventoryForSku.js';
import { registerGetShipmentStatusTool } from './tools/getShipmentStatus.js';
import { registerDiagnoseStuckOrderTool } from './tools/diagnoseStuckOrder.js';
import { registerCreateEscalationTool } from './tools/createEscalation.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'order-investigation-mcp',
    version: '1.0.0'
  });

  registerGetOrderTool(server);
  registerGetPaymentStatusTool(server);
  registerGetInventoryForSkuTool(server);
  registerGetShipmentStatusTool(server);
  registerDiagnoseStuckOrderTool(server);
  registerCreateEscalationTool(server);

  return server;
}

export const mcpServer = createMcpServer();

export const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mcp-session-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

interface Session {
  transport: SSEServerTransport;
  server: McpServer;
}

const sessions = new Map<string, Session>();

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();

  sessions.set(transport.sessionId, { transport, server });

  req.on('close', () => {
    sessions.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = sessions.get(sessionId);
  if (session) {
    await session.transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('Session not found');
  }
});
