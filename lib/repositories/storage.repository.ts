import { BaseRepository } from '@/lib/repositories/base/base.repository'

const ALLOWED_BUCKETS = ['portfolio', 'deliverables', 'attachments'] as const
export type StorageBucket = (typeof ALLOWED_BUCKETS)[number]

export class StorageRepository extends BaseRepository {
  private assertBucket(bucket: string): StorageBucket {
    if (!ALLOWED_BUCKETS.includes(bucket as StorageBucket)) {
      throw new Error(`Invalid storage bucket: ${bucket}`)
    }
    return bucket as StorageBucket
  }

  async upload(input: {
    bucket: string
    path: string
    contentBase64: string
    contentType: string
    upsert?: boolean
  }) {
    const bucket = this.assertBucket(input.bucket)
    const bytes = Buffer.from(input.contentBase64, 'base64')
    const { error } = await this.ctx.supabase.storage.from(bucket).upload(input.path, bytes, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
    })
    if (error) throw new Error(error.message)
    return { path: input.path, bucket }
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600) {
    const safeBucket = this.assertBucket(bucket)
    const { data, error } = await this.ctx.supabase.storage
      .from(safeBucket)
      .createSignedUrl(path, expiresInSeconds)
    if (error) throw new Error(error.message)
    return data?.signedUrl ?? null
  }

  getPublicUrl(bucket: string, path: string) {
    const safeBucket = this.assertBucket(bucket)
    const { data } = this.ctx.supabase.storage.from(safeBucket).getPublicUrl(path)
    return data.publicUrl
  }

  async deleteFile(bucket: string, path: string) {
    const safeBucket = this.assertBucket(bucket)
    const { error } = await this.ctx.supabase.storage.from(safeBucket).remove([path])
    if (error) throw new Error(error.message)
  }

  async listFiles(bucket: string, prefix?: string, limit = 100) {
    const safeBucket = this.assertBucket(bucket)
    const { data, error } = await this.ctx.supabase.storage.from(safeBucket).list(prefix ?? '', {
      limit: Math.min(limit, 100),
    })
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async moveFile(bucket: string, fromPath: string, toPath: string) {
    const safeBucket = this.assertBucket(bucket)
    const { error } = await this.ctx.supabase.storage.from(safeBucket).move(fromPath, toPath)
    if (error) throw new Error(error.message)
    return { path: toPath }
  }
}
