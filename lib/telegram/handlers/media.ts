import type { Bot, Context } from "grammy"
import { InputFile } from "grammy"
import { logToolUsage } from "@/lib/db/repositories/usage-logs"
import { getUserByTelegramId, setPendingAction, setUserWatermark, upsertUserFromTelegram } from "@/lib/db/repositories/users"
import { downloadIncomingFile } from "@/lib/telegram/helpers"
import { applyUserWatermark } from "@/lib/media/watermark"
import { saveWatermarkLogo } from "@/lib/media/watermark-storage"

const WATERMARK_TRIGGER_WORDS = ["watermark", "wm"]

function wantsWatermark(caption: string | undefined) {
  if (!caption) return false
  const normalized = caption.trim().toLowerCase()
  return WATERMARK_TRIGGER_WORDS.some((word) => normalized === word || normalized.startsWith(`${word} `))
}

async function handleWatermarkLogoUpload(ctx: Context, telegramId: number) {
  const { buffer, contentType } = await downloadIncomingFile(ctx)
  const pathname = await saveWatermarkLogo(telegramId, buffer, contentType)
  await setUserWatermark(telegramId, { blobPathname: pathname })
  await setPendingAction(telegramId, null)
  await ctx.reply("Logo saved! Send a photo or video with the caption \"watermark\" to brand it. ✅")
}

async function handleApplyWatermark(ctx: Context, telegramId: number, kind: "photo" | "video") {
  const startedAt = Date.now()
  const statusMessage = await ctx.reply(kind === "photo" ? "Applying watermark… 🖌" : "Watermarking video, this can take a bit… 🎬")

  try {
    const user = await getUserByTelegramId(telegramId)
    const { buffer } = await downloadIncomingFile(ctx)
    const output = await applyUserWatermark(user!, { buffer, kind })

    if (kind === "photo") {
      await ctx.replyWithPhoto(new InputFile(output, "watermarked.jpg"))
    } else {
      await ctx.replyWithVideo(new InputFile(output, "watermarked.mp4"))
    }

    await logToolUsage({
      telegramId,
      toolName: "watermark",
      status: "success",
      detail: kind,
      durationMs: Date.now() - startedAt,
    })
  } catch (error) {
    console.error("[v0] Watermark failed:", error)
    await ctx.reply("Sorry, I couldn't apply the watermark to that file. Please try a different file.")
    await logToolUsage({
      telegramId,
      toolName: "watermark",
      status: "error",
      detail: error instanceof Error ? error.message : "unknown error",
      durationMs: Date.now() - startedAt,
    })
  } finally {
    await ctx.api.deleteMessage(statusMessage.chat.id, statusMessage.message_id).catch(() => {})
  }
}

export function registerMediaHandlers(bot: Bot) {
  bot.on(["message:photo", "message:video"], async (ctx) => {
    if (!ctx.from) return
    const telegramId = ctx.from.id
    await upsertUserFromTelegram(ctx.from)

    const user = await getUserByTelegramId(telegramId)
    const caption = ctx.message.caption

    if (user?.pendingAction === "awaiting_watermark_logo") {
      await handleWatermarkLogoUpload(ctx, telegramId)
      return
    }

    if (wantsWatermark(caption)) {
      const kind = "photo" in ctx.message ? "photo" : "video"
      await handleApplyWatermark(ctx, telegramId, kind)
      return
    }

    await ctx.reply(
      'Nice media! Send it again with the caption "watermark" to brand it, or use /setwatermark to upload a custom logo first.',
    )
  })

  // Documents (e.g. a logo sent as a file instead of a compressed photo).
  bot.on("message:document", async (ctx) => {
    if (!ctx.from) return
    const telegramId = ctx.from.id
    await upsertUserFromTelegram(ctx.from)

    const user = await getUserByTelegramId(telegramId)
    if (user?.pendingAction === "awaiting_watermark_logo") {
      await handleWatermarkLogoUpload(ctx, telegramId)
      return
    }

    await ctx.reply("I received your file. If that was a watermark logo, run /setwatermark first, then resend it.")
  })
}
