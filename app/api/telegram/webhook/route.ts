import { webhookCallback } from "grammy"
import { getBot } from "@/lib/telegram/bot"

export const runtime = "nodejs"
export const maxDuration = 300 // video watermarking can take a while

export async function POST(request: Request) {
  try {
    const handleUpdate = webhookCallback(getBot(), "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    })
    return await handleUpdate(request)
  } catch (error) {
    console.error("[v0] Telegram webhook error:", error)
    return new Response("OK", { status: 200 }) // ack anyway so Telegram doesn't retry storms
  }
}
