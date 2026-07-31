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

  // Register all 6 tools for each server instance
  registerGetOrderTool(server);
  registerGetPaymentStatusTool(server);
  registerGetInventoryForSkuTool(server);
  registerGetShipmentStatusTool(server);
  registerDiagnoseStuckOrderTool(server);
  registerCreateEscalationTool(server);

  return server;
}

// Default export instance for direct testing
export const mcpServer = createMcpServer();

export const app = express();

// Enable basic CORS headers for cross-origin browser access (e.g. MCP Inspector Web UI)
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

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Map to manage active session transports and server instances
interface Session {
  transport: SSEServerTransport;
  server: McpServer;
}

const sessions = new Map<string, Session>();

// Streamable HTTP / SSE endpoint
app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();

  sessions.set(transport.sessionId, { transport, server });

  req.on('close', () => {
    sessions.delete(transport.sessionId);
  });

  await server.connect(transport);
});

// Message endpoint for SSE client communication
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = sessions.get(sessionId);
  if (session) {
    // Pass req.body explicitly because express.json() consumed the raw stream
    await session.transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('Session not found');
  }
});
