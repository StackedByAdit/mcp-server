import { describe, it, expect } from 'vitest';
import { app, mcpServer } from '../src/mcp/server.js';
import http from 'http';

describe('Express MCP Server Setup', () => {
  it('should have McpServer defined', () => {
    expect(mcpServer).toBeDefined();
  });

  it('should respond to GET /health with status ok', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const res = await fetch(`http://localhost:${port}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });

    await new Promise((resolve) => server.close(resolve));
  });
});
