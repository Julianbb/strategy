
import { z } from 'zod';

const textPartSchema = z.object({
    text: z.string().min(1).max(2000),
    type: z.enum(['text']),
  });
  
export const createStrategyChatSchema = z.object({
    id: z.string().uuid(),
    strategyName: z.string().min(1).max(200).optional(),
    baseCurrency: z.string().length(3).optional(),
    initialCapital_USD: z.number().min(0).optional(),
    initialCapital_Currency: z.number().min(0).optional(),
    strategyTypeId: z.string().uuid().optional(),
    message: z.object({
      id: z.string().uuid(),
      createdAt: z.coerce.date(),
      role: z.enum(['user']),
      content: z.string().min(1).max(2000),
      parts: z.array(textPartSchema),
      experimental_attachments: z
        .array(
          z.object({
            url: z.string().url(),
            name: z.string().min(1).max(2000),
            contentType: z.enum(['image/png', 'image/jpg', 'image/jpeg']),
          }),
        )
        .optional(),
    }),
  });

export const updateStrategyChatStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'paused', 'stopped', 'completed']),
});

export type PostRequestBody = z.infer<typeof createStrategyChatSchema>;
export type PatchRequestBody = z.infer<typeof updateStrategyChatStatusSchema>;
