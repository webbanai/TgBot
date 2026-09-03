import { Bot } from "grammy"
import { registerCommandHandlers } from "@/lib/telegram/handlers/commands"
import { registerMediaHandlers } from "@/lib/telegram/handlers/media"
import { registerTextHandler } from "@/lib/telegram/handlers/text"

function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set")
  }

  const bot = new Bot(token)

  registerCommandHandlers(bot)
  registerMediaHandlers(bot)
  registerTextHandler(bot)

  bot.catch((err) => {
    console.error("[v0] Unhandled bot error:", err.message, err.error)
  })

  return bot
}

declare global {
  // eslint-disable-next-line no-var
  var __telegramBot: Bot | undefined
}

// One bot instance per server process — handlers are stateless, so sharing
// it across requests/hot-reloads avoids re-registering listeners.
export const bot = globalThis.__telegramBot ?? createBot()

if (process.env.NODE_ENV !== "production") {
  globalThis.__telegramBot = bot
}
