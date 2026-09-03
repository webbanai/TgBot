import { and, asc, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { botConversations } from "@/lib/db/schema"

/** Number of most-recent turns kept as context for the AI agent. */
const HISTORY_LIMIT = 20

export async function appendMessage(telegramId: number, role: "user" | "assistant", content: string) {
  await db.insert(botConversations).values({ telegramId, role, content })
}

/** Returns the last N messages in chronological order (oldest first). */
export async function getRecentHistory(telegramId: number, limit = HISTORY_LIMIT) {
  const rows = await db
    .select()
    .from(botConversations)
    .where(eq(botConversations.telegramId, telegramId))
    .orderBy(desc(botConversations.createdAt))
    .limit(limit)

  return rows.reverse()
}

export async function clearHistory(telegramId: number) {
  await db.delete(botConversations).where(eq(botConversations.telegramId, telegramId))
}

/** Keeps the table small by trimming history beyond the retention window per user. */
export async function pruneHistory(telegramId: number, keep = HISTORY_LIMIT * 2) {
  const rows = await db
    .select({ id: botConversations.id })
    .from(botConversations)
    .where(eq(botConversations.telegramId, telegramId))
    .orderBy(asc(botConversations.createdAt))

  if (rows.length <= keep) return

  const idsToDelete = rows.slice(0, rows.length - keep).map((r) => r.id)
  if (idsToDelete.length === 0) return

  await db.delete(botConversations).where(
    and(eq(botConversations.telegramId, telegramId), sql`${botConversations.id} = ANY(${idsToDelete})`),
  )
}
