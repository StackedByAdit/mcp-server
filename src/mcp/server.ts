import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';

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

  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    const rawTools = Object.entries((server as any)._registeredTools)
      .filter(([, tool]: any) => tool.enabled)
      .map(([name, tool]: [string, any]) => {
        const obj = tool.inputSchema;
        const inputSchema = obj
          ? toJsonSchemaCompat(obj, { strictUnions: true, pipeStrategy: 'input' })
          : { type: 'object' };
        return {
          name,
          description: tool.description,
          inputSchema
        };
      });
    return { tools: rawTools };
  });

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

// Explicit JSON 404 for OAuth discovery routes to signal to clients (like Claude Desktop) that auth is not supported
app.get(['/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource', '/.well-known/*'], (_req, res) => {
  res.status(404).json({ error: 'oauth_not_supported', message: 'This MCP server is unauthenticated and does not support OAuth.' });
});

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

  const sessionId = transport.sessionId;
  sessions.set(sessionId, { transport, server });

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
