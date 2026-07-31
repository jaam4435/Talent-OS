import { z } from 'zod'
import { KNOWLEDGE_CATEGORIES } from '@/modules/knowledge/types'

const linksSchema = z
  .object({
    entityType: z.string().optional(),
    entityId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    opportunityId: z.string().uuid().optional(),
    freelancerId: z.string().uuid().optional(),
    milestoneId: z.string().uuid().optional(),
  })
  .optional()

export const createKnowledgeEntrySchema = z.object({
  category: z.enum(KNOWLEDGE_CATEGORIES),
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().max(100_000).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
  links: linksSchema,
  storage: z
    .object({
      bucket: z.string(),
      path: z.string(),
      mimeType: z.string().optional(),
      fileSizeBytes: z.number().int().positive().optional(),
    })
    .optional(),
})

export const updateKnowledgeEntrySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(100_000).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
  links: linksSchema,
})

export const knowledgeSearchSchema = z.object({
  query: z.string().min(1).max(500),
  categories: z.array(z.enum(KNOWLEDGE_CATEGORIES)).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
})

export const createEmbeddingChunkSchema = z.object({
  entryId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  content: z.string().min(1).max(8000),
  tokenCount: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
})
