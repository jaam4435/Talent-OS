import type { ProductDefinition } from '@/modules/platform/contracts/product-registry'

export const MEDIA_INTEL_PRODUCT: ProductDefinition = {
  productId: 'media_intel',
  displayName: 'Media Intelligence',
  enabled: false,
  defaultConfig: {},
  metadata: {
    description: 'Media analytics product — registered, not yet enabled',
  },
}
