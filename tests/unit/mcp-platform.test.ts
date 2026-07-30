import { describe, expect, it } from 'vitest'
import { MCP_TOOL_HANDLERS, MCP_ADAPTER_TOOL_COUNT } from '@/lib/mcp/adapters'
import { ALL_MCP_TOOL_NAMES, MCP_SERVER_COUNT } from '@/lib/mcp/servers'

describe('MCP platform', () => {
  it('registers an adapter for every defined tool', () => {
    for (const toolName of ALL_MCP_TOOL_NAMES) {
      expect(MCP_TOOL_HANDLERS[toolName], `missing adapter for ${toolName}`).toBeTypeOf('function')
    }
    expect(MCP_ADAPTER_TOOL_COUNT).toBe(ALL_MCP_TOOL_NAMES.length)
  })

  it('includes marketplace server in catalog', () => {
    expect(MCP_SERVER_COUNT).toBeGreaterThanOrEqual(11)
    expect(ALL_MCP_TOOL_NAMES).toContain('marketplace_search_profiles')
  })

  it('gateway discovers all servers', async () => {
    const { getMcpGateway } = await import('@/lib/mcp/gateway')
    const servers = getMcpGateway().discover()
    expect(servers.some((s) => s.metadata.id === 'marketplace')).toBe(true)
    expect(servers.some((s) => s.metadata.id === 'crm')).toBe(true)
  })
})
