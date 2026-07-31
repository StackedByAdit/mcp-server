# Order Investigation MCP Server

An AI-native operations tool that enables e-commerce support and ops teams to independently investigate, diagnose, and escalate stuck customer orders without needing engineering intervention.

## Hosted MCP Endpoint
- **Hosted URL**: `https://<your-hosted-domain>/mcp` *(Note: Free-tier hosts may experience a brief cold-start delay on initial connection)*
- **Health Check**: `https://<your-hosted-domain>/health`

## Architecture & Safety Principles
> **Propose-Only & Read-Only Design**: This server explicitly contains **no automated mutation or execution tools** (no order cancellation, payment processing, or fulfillment re-triggering). `createEscalation` is strictly a logging tool for human review.

## Available MCP Tools
1. `getOrder`: Retrieves the current state, status, and timestamps for an order.
2. `getPaymentStatus`: Checks if payment is captured, pending, or failed.
3. `getInventoryForSku`: Checks available vs. reserved stock levels to identify backorders.
4. `getShipmentStatus`: Checks whether a shipment record and tracking number exist.
5. `diagnoseStuckOrder`: Evaluates payment, fulfillment, and inventory in priority order to return a single root-cause diagnosis.
6. `createEscalation`: Logs a human-review escalation with evidence and deduplicates repeated requests within a 10-minute window.

## Synthetic Mock Order Scenarios
- **Order A (`ORD-1001`) — Healthy Control**: Payment captured, fulfillment triggered, shipment created.
- **Order B (`ORD-1002`) — Inventory-Gated Stall**: Payment captured, fulfillment not started because SKU `SKU-BACKORDERED-02` is backordered (`reservedQty > availableQty`).
- **Order C (`ORD-1003`) — Independent Job Stall**: Payment captured, fulfillment not started despite full inventory (`availableQty: 50`) — indicates an independent queue/worker failure.
- **Order D (`ORD-1004`) — Payment Pending**: Payment status is pending, correctly blocking fulfillment triggering before inventory is checked.

## Local Setup & Testing
```bash
# Install dependencies
npm install

# Run locally in development mode (watch mode via tsx)
npm run dev

# Run Vitest test suite
npm test
```

## Explicit Exclusions / Out of Scope
- **Authentication & User Management**: No API keys or OAuth required (uses synthetic, non-credential data).
- **Persistent Database**: Uses in-memory TypeScript data structures with zero database infrastructure overhead.
- **Automated Remediation**: No automated writes or mutation tools exist on commerce backends.
- **Frontend UI**: No custom graphical dashboard (designed specifically for AI clients/consumers via MCP).
