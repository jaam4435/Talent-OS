import type { ProductId } from '@/modules/platform/types'

export interface ProductDefinition {
  readonly productId: ProductId
  readonly displayName: string
  readonly enabled: boolean
  readonly defaultConfig: Record<string, unknown>
  readonly metadata: Record<string, unknown>
}

export interface IProductRegistry {
  resolve(productId: ProductId): ProductDefinition
  list(): readonly ProductDefinition[]
  isEnabled(productId: ProductId): boolean
}
