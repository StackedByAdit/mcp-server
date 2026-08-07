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

let _mcpServerInstance: McpServer | undefined;
export const mcpServer = new Proxy({} as McpServer, {
  get(_target, prop) {
    if (!_mcpServerInstance) _mcpServerInstance = createMcpServer();
    return (_mcpServerInstance as any)[prop];
  }
});

export const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : null;

app.use((req, res, next) => {
  const origin = req.headers.origin ?? '';
  const originHeader =
    allowedOrigins === null
      ? '*'
      : allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0];
  res.header('Access-Control-Allow-Origin', originHeader);
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
  createdAt: number;
}

const sessions = new Map<string, Session>();

const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, SESSION_TTL_MS).unref();

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  const server = createMcpServer();

  const sessionId = transport.sessionId;
  sessions.set(sessionId, { transport, server, createdAt: Date.now() });

  transport.onclose = () => {
    sessions.delete(sessionId);
  };

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
