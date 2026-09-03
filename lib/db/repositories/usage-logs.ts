import { and, count, eq, gte } from "drizzle-orm"
import { db } from "@/lib/db"
import { botUsageLogs } from "@/lib/db/schema"

export async function logToolUsage(input: {
  telegramId: number
  toolName: string
  status: "success" | "error"
  detail?: string
  durationMs?: number
}) {
  await db.insert(botUsageLogs).values({
    telegramId: input.telegramId,
    toolName: input.toolName,
    status: input.status,
    detail: input.detail ?? null,
    durationMs: input.durationMs ?? null,
  })
}

export async function getUserStats(telegramId: number) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({ toolName: botUsageLogs.toolName, total: count() })
    .from(botUsageLogs)
    .where(and(eq(botUsageLogs.telegramId, telegramId), gte(botUsageLogs.createdAt, since)))
    .groupBy(botUsageLogs.toolName)

  const [{ total }] = await db
    .select({ total: count() })
    .from(botUsageLogs)
    .where(eq(botUsageLogs.telegramId, telegramId))

  return { byTool: rows, allTimeTotal: total }
}
