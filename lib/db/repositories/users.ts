import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { botUsers } from "@/lib/db/schema"
import type { TelegramFrom } from "@/lib/telegram/types"

/**
 * Fetches the user row for a Telegram id, creating it on first contact.
 * Also keeps the cached profile fields (name/username) fresh.
 */
export async function upsertUserFromTelegram(from: TelegramFrom) {
  const [user] = await db
    .insert(botUsers)
    .values({
      telegramId: from.id,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
    })
    .onConflictDoUpdate({
      target: botUsers.telegramId,
      set: {
        username: from.username ?? null,
        firstName: from.first_name ?? null,
        lastName: from.last_name ?? null,
        languageCode: from.language_code ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()

  return user
}

export async function getUserByTelegramId(telegramId: number) {
  const [user] = await db.select().from(botUsers).where(eq(botUsers.telegramId, telegramId)).limit(1)
  return user ?? null
}

export async function setUserWatermark(
  telegramId: number,
  data: { blobPathname: string | null; position?: string; opacity?: number },
) {
  await db
    .update(botUsers)
    .set({
      watermarkBlobPathname: data.blobPathname,
      ...(data.position ? { watermarkPosition: data.position } : {}),
      ...(data.opacity !== undefined ? { watermarkOpacity: data.opacity } : {}),
      updatedAt: new Date(),
    })
    .where(eq(botUsers.telegramId, telegramId))
}

export async function setUserWatermarkOptions(
  telegramId: number,
  data: { position?: string; opacity?: number },
) {
  await db
    .update(botUsers)
    .set({
      ...(data.position ? { watermarkPosition: data.position } : {}),
      ...(data.opacity !== undefined ? { watermarkOpacity: data.opacity } : {}),
      updatedAt: new Date(),
    })
    .where(eq(botUsers.telegramId, telegramId))
}

export async function setPendingAction(telegramId: number, pendingAction: string | null) {
  await db.update(botUsers).set({ pendingAction, updatedAt: new Date() }).where(eq(botUsers.telegramId, telegramId))
}
