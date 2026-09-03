import type { Bot } from "grammy"
import { InlineKeyboard } from "grammy"
import { clearHistory } from "@/lib/db/repositories/conversations"
import {
  getUserByTelegramId,
  setPendingAction,
  setUserWatermark,
  setUserWatermarkOptions,
  upsertUserFromTelegram,
} from "@/lib/db/repositories/users"
import { getUserStats } from "@/lib/db/repositories/usage-logs"
import { deleteWatermarkLogo } from "@/lib/media/watermark-storage"

const WELCOME_MESSAGE = `*Welcome!* I'm an AI assistant with a few superpowers:

- 💬 Chat with me about anything
- 🔎 Web search — ask about anything current
- ⬇️ Download media — send me a direct file URL
- 🖼 Watermark photos & videos — send a photo/video with caption "watermark"

Type /help to see all commands.`

const HELP_MESSAGE = `*Commands*
/start – welcome message
/help – this message
/reset – clear our conversation memory
/setwatermark – upload a logo to use as your watermark
/mywatermark – view or change your watermark settings
/stats – your usage stats

*Tips*
• Send me a direct link to a file and I'll download it for you.
• Send a photo or video with the caption "watermark" to brand it.
• Ask me anything — I can search the web when needed.`

export function registerCommandHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    if (ctx.from) await upsertUserFromTelegram(ctx.from)
    await ctx.reply(WELCOME_MESSAGE, { parse_mode: "Markdown" })
  })

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_MESSAGE, { parse_mode: "Markdown" })
  })

  bot.command("reset", async (ctx) => {
    if (!ctx.from) return
    await clearHistory(ctx.from.id)
    await ctx.reply("Memory cleared. Let's start fresh! 🧹")
  })

  bot.command("setwatermark", async (ctx) => {
    if (!ctx.from) return
    await upsertUserFromTelegram(ctx.from)
    await setPendingAction(ctx.from.id, "awaiting_watermark_logo")
    await ctx.reply(
      "Send me the logo image you want to use as your watermark (as a photo or file). It will be applied to future photos/videos you send with the caption \"watermark\".",
    )
  })

  bot.command("mywatermark", async (ctx) => {
    if (!ctx.from) return
    const user = await getUserByTelegramId(ctx.from.id)

    const status = user?.watermarkBlobPathname ? "Custom logo saved ✅" : "No logo set — using text watermark"
    const keyboard = new InlineKeyboard()
      .text("Top Left", "wm_pos:top-left")
      .text("Top Right", "wm_pos:top-right")
      .row()
      .text("Center", "wm_pos:center")
      .row()
      .text("Bottom Left", "wm_pos:bottom-left")
      .text("Bottom Right", "wm_pos:bottom-right")
      .row()
      .text("Remove logo", "wm_remove")

    await ctx.reply(
      `*Your watermark settings*\nLogo: ${status}\nPosition: ${user?.watermarkPosition ?? "bottom-right"}\nOpacity: ${Math.round(
        (user?.watermarkOpacity ?? 0.6) * 100,
      )}%\n\nTap a position to change it:`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    )
  })

  bot.command("stats", async (ctx) => {
    if (!ctx.from) return
    const stats = await getUserStats(ctx.from.id)

    if (stats.byTool.length === 0) {
      await ctx.reply("No tool usage yet — try asking me to search the web or download a file!")
      return
    }

    const lines = stats.byTool.map((row) => `• ${row.toolName}: ${row.total} (last 30 days)`).join("\n")
    await ctx.reply(`*Your usage*\nTotal actions: ${stats.allTimeTotal}\n\n${lines}`, { parse_mode: "Markdown" })
  })

  bot.callbackQuery(/^wm_pos:(.+)$/, async (ctx) => {
    if (!ctx.from) return
    const position = ctx.match[1]
    await setUserWatermarkOptions(ctx.from.id, { position })
    await ctx.answerCallbackQuery({ text: `Position set to ${position}` })
    await ctx.editMessageReplyMarkup()
  })

  bot.callbackQuery("wm_remove", async (ctx) => {
    if (!ctx.from) return
    const user = await getUserByTelegramId(ctx.from.id)
    if (user?.watermarkBlobPathname) {
      await deleteWatermarkLogo(user.watermarkBlobPathname)
    }
    await setUserWatermark(ctx.from.id, { blobPathname: null })
    await ctx.answerCallbackQuery({ text: "Logo removed — using text watermark now" })
  })
}
