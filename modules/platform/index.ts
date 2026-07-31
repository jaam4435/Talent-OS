// Types
export type {
  OrganizationContext,
  PlatformConfigScope,
  PlatformEventNamespace,
  PlatformEventPayload,
  PlatformEventType,
  PlatformFeatureFlag,
  ProductId,
} from '@/modules/platform/types'
export { PRODUCT_IDS, isProductId } from '@/modules/platform/types'

// Contracts
export type { IPlatformClient } from '@/modules/platform/contracts/platform-client'
export type { IConfigService, ConfigGetOptions, ConfigValue } from '@/modules/platform/contracts/config-provider'
export type {
  IFeatureFlagService,
  FeatureFlagEvaluateOptions,
} from '@/modules/platform/contracts/feature-flag-provider'
export type { IPlatformEventEmitter, PlatformEmitInput } from '@/modules/platform/contracts/event-emitter'
export type { IProductRegistry, ProductDefinition } from '@/modules/platform/contracts/product-registry'

// Context
export {
  createOrganizationContext,
  createSystemOrganizationContext,
} from '@/modules/platform/context/organization'
export {
  resolveOrganizationContext,
  resolveOrganizationContextAsync,
} from '@/modules/platform/context/resolver'
export type { OrganizationContextSource } from '@/modules/platform/context/resolver'

// Products
export { ProductRegistry, assertProductEnabled, BUILTIN_PRODUCTS } from '@/modules/platform/products/registry'

// Features
export { FeatureFlagService, createFeatureFlagService } from '@/modules/platform/features/flags'
export { PLATFORM_FLAG_KEYS, envFlagKey, envConfigKey } from '@/modules/platform/features/registry'

// Config
export { ConfigService, createConfigService } from '@/modules/platform/config/service'
export { deepMerge } from '@/modules/platform/config/schema'

// Events
export {
  PlatformEventEmitter,
  createPlatformEventEmitter,
  createDefaultPlatformEventEmitter,
} from '@/modules/platform/events/emitter'
export { PLATFORM_EVENTS, AI_EVENTS, PLATFORM_EVENT_CATALOG } from '@/modules/platform/events/catalog'

// SDK
export { createPlatformClient, PlatformClient } from '@/modules/platform/sdk'
export type { CreatePlatformClientOptions, PlatformClientDependencies } from '@/modules/platform/sdk'
