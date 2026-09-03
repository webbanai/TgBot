import type { Bot } from "grammy"
import { InputFile } from "grammy"
import type { ModelMessage } from "ai"
import { runAgent } from "@/lib/ai/agent"
import { appendMessage, getRecentHistory, pruneHistory } from "@/lib/db/repositories/conversations"
import { logToolUsage } from "@/lib/db/repositories/usage-logs"
import { setPendingAction, upsertUserFromTelegram } from "@/lib/db/repositories/users"
import { splitForTelegram } from "@/lib/telegram/helpers"

export function registerTextHandler(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    if (!ctx.from || ctx.message.text.startsWith("/")) return

    const telegramId = ctx.from.id
    const text = ctx.message.text
    await upsertUserFromTelegram(ctx.from)
    await setPendingAction(telegramId, null)

    await ctx.replyWithChatAction("typing")
    const history = await getRecentHistory(telegramId)
    const modelHistory: ModelMessage[] = history.map((row) => ({
      role: row.role === "user" ? "user" : "assistant",
      content: row.content,
    }))

    const startedAt = Date.now()
    try {
      const result = await runAgent({
        history: modelHistory,
        message: text,
        downloadCtx: {
          sendFile: async ({ buffer, fileName, contentType }) => {
            const file = new InputFile(buffer, fileName)
            if (contentType.startsWith("image/")) {
              await ctx.replyWithPhoto(file)
            } else if (contentType.startsWith("video/")) {
              await ctx.replyWithVideo(file)
            } else if (contentType.startsWith("audio/")) {
              await ctx.replyWithAudio(file)
            } else {
              await ctx.replyWithDocument(file)
            }
          },
        },
      })

      await appendMessage(telegramId, "user", text)
      await appendMessage(telegramId, "assistant", result.text || "(sent a file)")
      await pruneHistory(telegramId)

      const usedTools = result.steps.flatMap((step) => step.toolCalls.map((call) => call.toolName))
      for (const toolName of new Set(usedTools)) {
        await logToolUsage({ telegramId, toolName, status: "success", durationMs: Date.now() - startedAt })
      }

      if (result.text) {
        for (const chunk of splitForTelegram(result.text)) {
          await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(() => ctx.reply(chunk))
        }
      }
    } catch (error) {
      console.error("[v0] Agent run failed:", error)
      await ctx.reply("Sorry, something went wrong while thinking about that. Please try again in a moment.")
      await logToolUsage({
        telegramId,
        toolName: "agent",
        status: "error",
        detail: error instanceof Error ? error.message : "unknown error",
        durationMs: Date.now() - startedAt,
      })
    }
  })
}
