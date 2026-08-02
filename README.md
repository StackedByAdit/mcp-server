# Order Investigation MCP Server

An AI-native operations tool that enables e-commerce support and ops teams to independently investigate, diagnose, and escalate stuck customer orders without needing engineering intervention.

## Hosted MCP Endpoint
- **Hosted URL**: `https://mcp-server-3xp9.onrender.com/mcp` *(Note: Free-tier hosts may experience a brief cold-start delay of 30-50s on initial connection)*
- **Health Check**: `https://mcp-server-3xp9.onrender.com/health`

## Architecture & Safety Principles
> **Propose-Only & Read-Only Design**: This server explicitly contains **no automated mutation or execution tools** (no order cancellation, payment processing, or fulfillment re-triggering). `createEscalation` is strictly a logging tool for human review.

> **Idempotency & Durability Guarantee**: Escalation creation is idempotent and durable — enforced via a Postgres unique constraint ensuring only one open escalation exists per order at a time, surviving server restarts.

## Available MCP Tools
1. `getOrder`: Retrieves the current state, status, and timestamps for an order.
2. `getPaymentStatus`: Checks if payment is captured, pending, or failed.
3. `getInventoryForSku`: Checks available vs. reserved stock levels to identify backorders.
4. `getShipmentStatus`: Checks whether a shipment record and tracking number exist.
5. `diagnoseStuckOrder`: Evaluates payment, fulfillment, and inventory in priority order to return a single root-cause diagnosis.
6. `createEscalation`: Logs a human-review escalation with evidence and prevents duplicate open escalations per order via database unique constraint.

## Escalation Lifecycle
The `escalations` table schema includes a `status` field with values `open` and `resolved`. In this bounded MCP, **only `open` is reachable** — the workflow here is limited to investigation and durable, idempotent escalation creation. Transitioning an escalation to `resolved` is intentionally out of scope for this MCP, and would be owned by a separate future human-review system (e.g., an internal ops dashboard or ticketing integration) — not a direct manual database update.

## Synthetic Mock Order Scenarios
- **Order A (`ORD-1001`) — Healthy Control**: Payment captured, fulfillment triggered, shipment created.
- **Order B (`ORD-1002`) — Inventory-Gated Stall**: Payment captured, fulfillment not started because SKU `SKU-BACKORDERED-02` is backordered (`reservedQty > availableQty`).
- **Order C (`ORD-1003`) — Independent Job Stall**: Payment captured, fulfillment not started despite full inventory (`availableQty: 50`) — indicates an independent queue/worker failure.
- **Order D (`ORD-1004`) — Payment Pending**: Payment status is pending, correctly blocking fulfillment triggering before inventory is checked.

## Database Setup & Migrations
Escalations are persisted in PostgreSQL for durability and idempotency across server restarts.

1. **Provision a Postgres Instance**: Provision a free PostgreSQL database using a managed provider such as [Neon](https://neon.tech), [Supabase](https://supabase.com), or Render Postgres.
2. **Run Migration SQL**: Manually execute the migration file against your database once:
```bash
   psql -f src/data/migrations/001_create_escalations.sql $DATABASE_URL
```
   (If `psql` isn't available locally, the migration can also be run via a short Node script using the `pg` package — see the repo's setup notes.)
3. **Set Environment Variable**: Ensure `DATABASE_URL` is set before starting the server:
```bash
   export DATABASE_URL="postgres://user:password@host:5432/dbname"
```

## Local Setup & Testing
```bash
# Install dependencies
npm install

# Run locally in development mode (watch mode via tsx)
npm run dev

# Run Vitest test suite
npm test
```

## Verification
- Automated tests cover the diagnosis logic across all 4 mock scenarios, and the Postgres-backed escalation idempotency guarantee (duplicate `createEscalation` calls for the same order return `already_escalated` rather than creating a second row).
- The deployed server was independently verified via a standalone protocol-level script (SSE connect → initialize → tools/list → tool calls) run directly against the hosted URL, confirming correct behavior end to end on the live deployment.
- Tool registration and schema correctness were additionally verified locally via stdio transport in MCP Inspector.

## Known Limitation
Some GUI-based MCP clients (e.g., Claude Desktop, MCP Inspector over HTTP) experienced intermittent SSE connection issues against this specific Render + Cloudflare hosting setup. Two underlying issues were identified and fixed during development — a non-standard SDK field that broke client-side schema parsing, and SSE proxy buffering — but full GUI-client compatibility over this hosting configuration was not completely resolved within the assignment's scope. The server's correctness was independently confirmed via stdio (local) and direct protocol-level testing (remote), so this is understood to be a client/hosting compatibility issue rather than an application-logic defect.

## Explicit Exclusions / Out of Scope
- **Authentication & User Management**: No API keys or OAuth required (uses synthetic, non-credential data).
- **Scope of Persistence**: Escalations are the only durable/persisted entity; orders/payments/inventory/shipments remain in-memory mock fixtures used as test evidence for the single investigation workflow.
- **Automated Remediation**: No automated writes or mutation tools exist on commerce backends.
- **Escalation Resolution**: No tool exists to transition an escalation from `open` to `resolved` — see "Escalation Lifecycle" above.
- **Frontend UI**: No custom graphical dashboard (designed specifically for AI clients/consumers via MCP).