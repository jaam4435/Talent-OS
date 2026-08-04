export * from '@/lib/integrations/ai/types'
export * from '@/lib/integrations/ai/matching'
export * from '@/lib/integrations/ai/governance'
export * from '@/lib/integrations/ai/brief-parse'
export * from '@/lib/integrations/ai/summary'
export * from '@/lib/integrations/ai/status-assessment'
export * from '@/lib/integrations/ai/executor'

/** All new AI features must use the gateway at `@/lib/ai`. */
export { getAiGateway, callAiStructured } from '@/lib/ai'
