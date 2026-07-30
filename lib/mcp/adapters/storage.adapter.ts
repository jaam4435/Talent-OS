import type { StorageToolInputs } from '@/lib/mcp/servers/storage.server'
import { mcpErr, mcpOk, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const STORAGE_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  storage_upload_file: async (input, ctx) => {
    const data = asInput<StorageToolInputs['storage_upload_file']>(input)
    try {
      const result = await ctx.services.storage.upload({
        bucket: data.bucket,
        path: data.path,
        contentBase64: data.content_base64,
        contentType: data.content_type,
        upsert: data.upsert,
      })
      return mcpOk(result)
    } catch (error) {
      return mcpErr(error instanceof Error ? error.message : 'Upload failed')
    }
  },

  storage_get_signed_url: async (input, ctx) => {
    const data = asInput<StorageToolInputs['storage_get_signed_url']>(input)
    const url = await ctx.services.storage.getSignedUrl(
      data.bucket,
      data.path,
      data.expires_in_seconds
    )
    if (!url) return mcpErr('Failed to create signed URL')
    return mcpOk({ url })
  },

  storage_get_public_url: async (input, ctx) => {
    const data = asInput<StorageToolInputs['storage_get_public_url']>(input)
    const url = ctx.services.storage.getPublicUrl(data.bucket, data.path)
    return mcpOk({ url })
  },

  storage_delete_file: async (input, ctx) => {
    const data = asInput<StorageToolInputs['storage_delete_file']>(input)
    await ctx.services.storage.deleteFile(data.bucket, data.path)
    return mcpOk({ success: true })
  },

  storage_list_files: async (input, ctx) => {
    const data = asInput<StorageToolInputs['storage_list_files']>(input)
    const files = await ctx.services.storage.listFiles(data.bucket, data.prefix, data.limit)
    return mcpOk({ files })
  },

  storage_move_file: async (input, ctx) => {
    const data = asInput<StorageToolInputs['storage_move_file']>(input)
    const result = await ctx.services.storage.moveFile(data.bucket, data.from_path, data.to_path)
    return mcpOk(result)
  },
}
