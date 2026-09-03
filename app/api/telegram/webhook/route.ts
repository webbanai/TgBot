import { webhookCallback } from "grammy"
import { bot } from "@/lib/telegram/bot"

export const runtime = "nodejs"
export const maxDuration = 300 // video watermarking can take a while

const handleUpdate = webhookCallback(bot, "std/http", {
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
})

export async function POST(request: Request) {
  try {
    return await handleUpdate(request)
  } catch (error) {
    console.error("[v0] Telegram webhook error:", error)
    return new Response("OK", { status: 200 }) // ack anyway so Telegram doesn't retry storms
  }
}
