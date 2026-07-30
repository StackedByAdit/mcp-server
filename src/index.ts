import { app } from './mcp/server.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
