import { vi } from 'vitest'

vi.stubEnv('NODE_ENV', 'test')

vi.mock('@/modules/core/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/modules/core/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))
