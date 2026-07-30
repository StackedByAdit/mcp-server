import { describe, it, expect } from 'vitest';
import { mcpServer } from '../src/mcp/server.js';

describe('mcpServer initialization', () => {
  it('should be instantiated correctly', () => {
    expect(mcpServer).toBeDefined();
  });
});
