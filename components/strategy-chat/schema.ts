import { z } from 'zod'

const strategyChatStatusSchema = z.union([
  z.literal('active'),
  z.literal('paused'),
  z.literal('stopped'),
  z.literal('completed'),
])
export type StrategyChatStatus = z.infer<typeof strategyChatStatusSchema>

// Updated to match database schema structure
const strategyChatSchema = z.object({
  id: z.string(),
  strategyTypeId: z.string(),
  userId: z.string(),
  strategyName: z.string(),
  baseCurrency: z.string(),
  initialCapital_USD: z.string().nullable(),
  initialCapital_Currency: z.string().nullable(),
  status: strategyChatStatusSchema,
  totalTrades: z.string(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})
export type StrategyChat = z.infer<typeof strategyChatSchema>

export const strategyChatListSchema = z.array(strategyChatSchema)