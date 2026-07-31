import type { ProductDefinition } from '@/modules/platform/contracts/product-registry'

export const TALENT_OS_PRODUCT: ProductDefinition = {
  productId: 'talent_os',
  displayName: 'Talent OS',
  enabled: true,
  defaultConfig: {
    ai: {
      defaultProvider: 'openai',
      maxConcurrentRequests: 10,
    },
  },
  metadata: {
    description: 'Multi-tenant talent marketplace and project platform',
  },
}
