import { z } from 'zod'
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from '@/modules/notifications/types'

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread_only: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => value === true || value === 'true'),
})

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: z.enum(NOTIFICATION_CATEGORIES),
        channel: z.enum(NOTIFICATION_CHANNELS).default('in_app'),
        enabled: z.boolean(),
      })
    )
    .min(1),
})
