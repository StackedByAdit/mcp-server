import https from 'https';

const RENDER_BASE_URL = 'https://mcp-server-3xp9.onrender.com';
const SSE_URL = `${RENDER_BASE_URL}/mcp`;

console.log(`[TEST] Starting Full MCP E2E Flow against: ${SSE_URL}\n`);

let sseRequest;
let sessionId = null;
let handledIds = new Set();
let lastDiagnosisOutput = null;

function runTest() {
  sseRequest = https.get(SSE_URL, (res) => {
    if (res.statusCode !== 200) {
      console.error(`[FAIL] SSE Connect Failed: HTTP status ${res.statusCode}`);
      process.exit(1);
    }

    let sseBuffer = '';
    res.on('data', (chunk) => {
      sseBuffer += chunk.toString();

      const match = sseBuffer.match(/\/messages\?sessionId=([a-zA-Z0-9-]+)/);
      if (match && !sessionId) {
        sessionId = match[1];
        console.log(`[SSE CONNECTED] Session ID: ${sessionId}\n`);
        setTimeout(() => performInitialize(sessionId), 200);
      }

      const events = sseBuffer.split('\n\n');
      sseBuffer = events.pop() || '';

      for (const rawEvent of events) {
        const lines = rawEvent.split('\n');
        let dataPayload = '';
        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataPayload += line.slice(5).trim();
          } else if (dataPayload && line.trim()) {
            dataPayload += line.trim();
          }
        }
        if (dataPayload) {
          try {
            const parsed = JSON.parse(dataPayload);
            handleSseMessage(parsed);
          } catch (_) {
            // Partial JSON
          }
        }
      }
    });

    res.on('error', (err) => {
      console.error(`[FAIL] SSE Stream Error:`, err);
      cleanExit(1);
    });
  });

  sseRequest.on('error', (err) => {
    console.error(`[FAIL] Unable to connect to ${SSE_URL}:`, err);
    process.exit(1);
  });
}

function handleSseMessage(msg) {
  if (!msg || !msg.id || handledIds.has(msg.id)) return;
  handledIds.add(msg.id);

  if (msg.id === 1) {
    console.log(`=== HANDSHAKE INITIALIZED ===`);
    console.log(`Server Protocol: ${msg.result?.protocolVersion || '2024-11-05'}`);
    console.log(`Server Info: ${JSON.stringify(msg.result?.serverInfo)}\n`);
    setTimeout(() => performToolsList(sessionId), 200);
  } else if (msg.id === 2) {
    console.log(`=== TOOLS LISTED ===`);
    const toolNames = msg.result?.tools?.map((t) => t.name) || [];
    console.log(`Available Tools (${toolNames.length}): ${toolNames.join(', ')}\n`);
    setTimeout(() => performDiagnose(sessionId), 200);
  } else if (msg.id === 3) {
    console.log(`=== DIAGNOSIS ===`);
    const textContent = msg.result?.content?.[0]?.text;
    console.log(textContent || JSON.stringify(msg.result, null, 2));
    console.log();
    try {
      lastDiagnosisOutput = JSON.parse(textContent);
    } catch (_) {
      lastDiagnosisOutput = { raw: textContent };
    }
    setTimeout(() => performFirstEscalation(sessionId), 200);
  } else if (msg.id === 4) {
    console.log(`=== FIRST ESCALATION ===`);
    const textContent = msg.result?.content?.[0]?.text;
    console.log(textContent || JSON.stringify(msg.result, null, 2));
    console.log();
    setTimeout(() => performSecondEscalation(sessionId), 200);
  } else if (msg.id === 5) {
    console.log(`=== SECOND ESCALATION (DEDUPE CHECK) ===`);
    const textContent = msg.result?.content?.[0]?.text;
    console.log(textContent || JSON.stringify(msg.result, null, 2));
    console.log();
    console.log(`==================================================`);
    console.log(`FULL MCP E2E HANDSHAKE & ESCALATION FLOW COMPLETED`);
    console.log(`==================================================\n`);
    cleanExit(0);
  }
}

function performInitialize(sessId) {
  const initPayload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-script', version: '1.0' }
    }
  };
  sendPostMessage(sessId, initPayload);
}

function performToolsList(sessId) {
  const toolsPayload = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  sendPostMessage(sessId, toolsPayload);
}

function performDiagnose(sessId) {
  const diagnosePayload = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'diagnoseStuckOrder',
      arguments: {
        orderId: 'ORD-1002'
      }
    }
  };
  sendPostMessage(sessId, diagnosePayload);
}

function performFirstEscalation(sessId) {
  const escalationPayload = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'createEscalation',
      arguments: {
        orderId: 'ORD-1002',
        evidence: lastDiagnosisOutput || { issue: 'ORD-1002 inventory backordered' },
        recommendedAction: 'Restock SKU and re-trigger fulfillment.'
      }
    }
  };
  sendPostMessage(sessId, escalationPayload);
}

function performSecondEscalation(sessId) {
  const escalationPayload = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'createEscalation',
      arguments: {
        orderId: 'ORD-1002',
        evidence: lastDiagnosisOutput || { issue: 'ORD-1002 inventory backordered' },
        recommendedAction: 'Duplicate request - restock SKU.'
      }
    }
  };
  sendPostMessage(sessId, escalationPayload);
}

function sendPostMessage(sessId, bodyPayload) {
  const data = JSON.stringify(bodyPayload);
  const postUrl = new URL(`${RENDER_BASE_URL}/messages?sessionId=${sessId}`);

  const req = https.request(
    postUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    },
    (res) => {
      if (res.statusCode !== 202) {
        console.error(`[FAIL] POST Request (ID ${bodyPayload.id}) Failed with HTTP status ${res.statusCode}`);
        cleanExit(1);
      }
    }
  );

  req.onerror = (err) => {
    console.error(`[FAIL] POST Request Error:`, err);
    cleanExit(1);
  };

  req.write(data);
  req.end();
}

function cleanExit(code) {
  if (sseRequest) {
    sseRequest.destroy();
  }
  process.exit(code);
}

runTest();
