import type { Repositories } from '@/lib/repositories/factory'

/** Supabase Storage operations — used by MCP storage tools. */
export class StorageService {
  constructor(private readonly repos: Repositories) {}

  upload(input: {
    bucket: string
    path: string
    contentBase64: string
    contentType: string
    upsert?: boolean
  }) {
    return this.repos.storage.upload(input)
  }

  getSignedUrl(bucket: string, path: string, expiresInSeconds?: number) {
    return this.repos.storage.getSignedUrl(bucket, path, expiresInSeconds)
  }

  getPublicUrl(bucket: string, path: string) {
    return this.repos.storage.getPublicUrl(bucket, path)
  }

  deleteFile(bucket: string, path: string) {
    return this.repos.storage.deleteFile(bucket, path)
  }

  listFiles(bucket: string, prefix?: string, limit?: number) {
    return this.repos.storage.listFiles(bucket, prefix, limit)
  }

  moveFile(bucket: string, fromPath: string, toPath: string) {
    return this.repos.storage.moveFile(bucket, fromPath, toPath)
  }
}
