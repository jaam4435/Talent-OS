import { vi } from 'vitest'

type QueryResult = { data: unknown; error: unknown; count?: number | null }

function makeThenable(result: QueryResult) {
  const handler: Record<string, ReturnType<typeof vi.fn>> = {}

  const proxy: Record<string, unknown> = {}

  const getChain = () =>
    new Proxy(proxy, {
      get(_target, prop) {
        if (prop === 'then') {
          return (onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
            Promise.resolve(result).then(onFulfilled, onRejected)
        }
        if (prop === 'catch') {
          return (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected)
        }
        if (!handler[prop as string]) {
          handler[prop as string] = vi.fn().mockImplementation(getChain)
        }
        return handler[prop as string]
      },
    })

  return getChain()
}

export function createMockSupabase(tableResults: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => makeThenable(tableResults[table] ?? { data: null, error: null })),
    rpc: vi.fn((fn: string) =>
      Promise.resolve(tableResults[`rpc:${fn}`] ?? { data: [], error: null })
    ),
  }
}

export const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111'
export const TEST_USER_ID = '22222222-2222-2222-2222-222222222222'
export const TEST_ENTRY_ID = '33333333-3333-3333-3333-333333333333'
