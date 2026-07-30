# MCP Platform

Talent OS implements an in-process MCP gateway with independent domain servers. All LLM and agent tool calls should route through `@/lib/mcp` rather than accessing data layers directly.

## Servers

See [MCP Implementation](./Platform/MCP_IMPLEMENTATION.md) for the full server catalog.

## Contracts

Tool contracts live in [`docs/mcp/contracts/`](../mcp/contracts/manifest.json).

## Rules

1. **Every tool calls Services** — adapters in `lib/mcp/adapters/` receive a `Services` graph from `createMcpServices()`.
2. **Never expose repositories** — MCP handlers must not import `@/lib/repositories`.
3. **Never expose database access** — no Supabase `.from()` calls in adapters.
4. **Authorization** — each tool declares `requiredPermission`; the gateway enforces RBAC before dispatch.

## Commands

| Command | Description |
|---------|-------------|
| `npm run mcp:contracts` | Generate JSON tool contracts |
| `npm run check:mcp-services` | Verify adapter layer boundaries |
| `npm run docs:generate` | Regenerate MCP tools catalog |
