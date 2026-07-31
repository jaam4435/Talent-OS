import { DomainError, ErrorCodes } from '@/modules/core/utils/errors'
import type {
  IProductRegistry,
  ProductDefinition,
} from '@/modules/platform/contracts/product-registry'
import type { ProductId } from '@/modules/platform/types'
import { isProductId } from '@/modules/platform/types'
import { AD_STUDIO_PRODUCT } from '@/modules/platform/products/ad-studio'
import { MEDIA_INTEL_PRODUCT } from '@/modules/platform/products/media-intel'
import { TALENT_OS_PRODUCT } from '@/modules/platform/products/talent-os'

const BUILTIN_PRODUCTS: Record<ProductId, ProductDefinition> = {
  talent_os: TALENT_OS_PRODUCT,
  media_intel: MEDIA_INTEL_PRODUCT,
  ad_studio: AD_STUDIO_PRODUCT,
}

export class ProductRegistry implements IProductRegistry {
  constructor(private readonly overrides: Partial<Record<ProductId, ProductDefinition>> = {}) {}

  resolve(productId: ProductId): ProductDefinition {
    if (!isProductId(productId)) {
      throw new DomainError(ErrorCodes.VALIDATION, `Unknown productId: ${productId}`)
    }

    return this.overrides[productId] ?? BUILTIN_PRODUCTS[productId]
  }

  list(): readonly ProductDefinition[] {
    return (Object.keys(BUILTIN_PRODUCTS) as ProductId[]).map((id) => this.resolve(id))
  }

  isEnabled(productId: ProductId): boolean {
    return this.resolve(productId).enabled
  }
}

export function assertProductEnabled(productId: ProductId, registry: IProductRegistry = new ProductRegistry()): void {
  if (!registry.isEnabled(productId)) {
    throw new DomainError(ErrorCodes.FORBIDDEN, `Product ${productId} is not enabled`)
  }
}

export { BUILTIN_PRODUCTS }
