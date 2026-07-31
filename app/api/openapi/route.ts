import { readFileSync } from 'fs'
import { join } from 'path'
import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'none', legacyEnvelope: true }, async () => {
  const specPath = join(process.cwd(), 'docs', 'openapi.yaml')
  const yaml = readFileSync(specPath, 'utf-8')
  return { spec: yaml, format: 'yaml', version: 'v1' }
})
