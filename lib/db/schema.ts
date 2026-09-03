import { bigint, bigserial, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core"

/**
 * One row per Telegram user. `telegramId` is the natural identity for this
 * bot — there is no separate auth system, the chat_id / user_id Telegram
 * gives us on every update is the user.
 */
export const botUsers = pgTable("bot_users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code"),
  watermarkBlobPathname: text("watermark_blob_pathname"),
  watermarkPosition: text("watermark_position").notNull().default("bottom-right"),
  watermarkOpacity: real("watermark_opacity").notNull().default(0.6),
  /** Transient flag for simple multi-step flows, e.g. "awaiting_watermark_logo". */
  pendingAction: text("pending_action"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Rolling chat history per user, used to give the AI agent short-term
 * memory across messages. Old rows are pruned by the conversations repo.
 */
export const botConversations = pgTable("bot_conversations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Append-only audit log of every tool invocation (web search, downloads,
 * watermarking, etc). Powers /stats and future observability.
 */
export const botUsageLogs = pgTable("bot_usage_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
  toolName: text("tool_name").notNull(),
  status: text("status").notNull(), // "success" | "error"
  detail: text("detail"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type BotUser = typeof botUsers.$inferSelect
export type BotConversation = typeof botConversations.$inferSelect
export type BotUsageLog = typeof botUsageLogs.$inferSelect
