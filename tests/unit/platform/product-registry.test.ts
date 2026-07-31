import { describe, expect, it } from 'vitest'
import {
  ProductRegistry,
  assertProductEnabled,
  BUILTIN_PRODUCTS,
} from '@/modules/platform/products/registry'
import { DomainError } from '@/modules/core/utils/errors'

describe('ProductRegistry', () => {
  it('resolves talent_os product', () => {
    const registry = new ProductRegistry()
    const product = registry.resolve('talent_os')
    expect(product.productId).toBe('talent_os')
    expect(product.enabled).toBe(true)
  })

  it('lists all three products', () => {
    const registry = new ProductRegistry()
    expect(registry.list()).toHaveLength(3)
    expect(registry.list().map((p) => p.productId)).toEqual([
      'talent_os',
      'media_intel',
      'ad_studio',
    ])
  })

  it('reports media_intel as disabled', () => {
    const registry = new ProductRegistry()
    expect(registry.isEnabled('media_intel')).toBe(false)
  })

  it('throws when asserting disabled product', () => {
    const registry = new ProductRegistry()
    expect(() => assertProductEnabled('ad_studio', registry)).toThrow(DomainError)
  })

  it('allows talent_os through enabled check', () => {
    const registry = new ProductRegistry()
    expect(() => assertProductEnabled('talent_os', registry)).not.toThrow()
  })

  it('supports overrides', () => {
    const registry = new ProductRegistry({
      media_intel: { ...BUILTIN_PRODUCTS.media_intel, enabled: true },
    })
    expect(registry.isEnabled('media_intel')).toBe(true)
  })
})
