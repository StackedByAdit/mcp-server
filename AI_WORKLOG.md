# AI Worklog

## Tools & Models Used

- **Claude (Sonnet, via chat)** — used for planning, scope negotiation, architecture decisions, and drafting client-facing questions/emails. Chosen because the task required back-and-forth reasoning and tradeoff analysis before any code existed, which benefits from a conversational model rather than an agentic coding tool.
- **Claude Sonnet 4.6 (CLI, within Antigravity IDE)** — used for implementation: scaffolding the project, writing the MCP tools, domain logic, database layer, and tests from detailed prompts I authored myself. Chosen for reliable, instruction-following code generation directly against the repo, with Antigravity IDE as the environment for reviewing, running, and iterating on the generated code alongside the CLI agent.
- **Gemini 3.6 Flash** — used for fast, lower-stakes tasks: quick lookups, boilerplate suggestions, and secondary sanity checks on smaller pieces of generated code, where speed mattered more than deep reasoning.

Model selection logic: planning and product decisions were done with me directing a conversational model closely, since those decisions had real consequences (client requirements, safety constraints) that needed my judgment at each step, not autonomous execution. Implementation was handed to Claude Sonnet 4.6 via CLI only after every decision (scope, tool list, data model, guardrails) was already locked — so the coding agent was executing a spec, not making product calls. Gemini 3.6 Flash was used selectively where quick, low-risk iteration was more valuable than deeper reasoning.

## How I Used AI to Plan and Break Down the Work

I used Claude to:
- Turn the open-ended assignment brief into a concrete, narrow problem (Order Investigation Agent, one workflow)
- Work through a structured decision log (problem scoping -> data modeling -> tool design -> guardrails -> deployment) before writing any code, explicitly separating "decisions I can make myself" from "decisions that needed client input"
- Convert each locked decision into a sequence of scoped, ordered prompts for the coding agent — one prompt per concern (scaffolding, data, domain logic, guardrails, tools, server, tests, README), each with explicit "do not add X" constraints to prevent scope creep

## Division of Responsibilities

- **Me:** problem scoping, all client communication, every product/safety decision (e.g., propose-only vs. execute, Postgres vs. in-memory), reviewing every AI-generated diff before accepting it, final data model rationale
- **AI (planning):** surfacing tradeoffs I hadn't considered, drafting client emails for me to edit/approve, structuring the decision log
- **AI (coding agent):** writing the actual TypeScript per my prompts — scaffolding, tool implementations, tests, README drafts

## Key Prompts / Instructions Supplied

Example of a constraint I put in nearly every implementation prompt: "Do not add any tool that mutates fulfillment, inventory, or payment state. Do not add a confirm:true execute path — this was explicitly ruled out by the client." This was necessary because the assignment's general "propose vs. execute" ambiguity had already been resolved by the client as a hard requirement, and a coding agent working from the assignment doc alone would likely default to building a more "complete-looking" execute path.

Another example: instructing the diagnosis logic to treat payment/fulfillment mismatch as the *only* top-level branch, with inventory as a sub-finding rather than a parallel root cause — this came directly from client feedback correcting my initial framing, and needed to be stated explicitly or the natural agent output would have built two equal-weight diagnostic branches.

## AI Suggestion I Corrected / Rejected

When first reasoning about persistence, Claude suggested in-memory storage with the limitation documented in the README, treating restart-data-loss as acceptable for a scoped demo. The client explicitly rejected this (and my SQLite/JSON fallback) and required PostgreSQL with escalation creation being idempotent *and* durable. I corrected course by redesigning the storage layer entirely: dropped my in-memory dedupe guard in favor of a database-level unique constraint (`WHERE status = 'open'`), which is actually a stronger idempotency guarantee than what either I or the AI originally proposed — a case where client feedback led to a better design than either of us had produced alone.

## How I Verified AI-Generated Work

- Read every generated file before running it — no diff accepted unverified
- Ran the vitest suite covering the diagnosis logic against all 4 mock scenarios (healthy, inventory-backorder stall, independent stall, payment-not-captured) to confirm the diagnosis tool actually differentiates causes rather than just checking one flag
- Manually tested the escalation idempotency behavior against the live Postgres instance: called `createEscalation` twice for the same order and confirmed the second call returned `already_escalated` rather than creating a duplicate row
- Connected the deployed MCP server to Claude Desktop / MCP inspector and manually walked through the tool-calling sequence end-to-end before recording the demo

## Remaining Risks / Unfinished Work

- Orders/payments/inventory/shipments remain in-memory fixtures (per client direction, these are test evidence only, not meant to be a persisted operational dataset) — this means the system can only "see" the 4 seeded scenarios, not arbitrary real orders
- No `resolveEscalation` tool exists yet — escalation status transitions from `open` to `resolved` would currently need to happen directly against the database, not through the MCP; flagged to the client as an open question and left schema-only pending their input
- Test database cleanup relies on manual DELETE statements between runs rather than a proper test-fixture teardown framework — acceptable at this scope but not production-grade
- No retry/backoff logic on the Postgres connection — a transient DB outage would surface as a raw tool error rather than a graceful structured response
