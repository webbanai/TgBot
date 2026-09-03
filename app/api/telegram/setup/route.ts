import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Registers this deployment's URL as the Telegram webhook. Visit
 * /api/telegram/setup once after each deploy (or domain change) to (re)point
 * Telegram at the current URL.
 */
export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!token) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const webhookUrl = `${origin}/api/telegram/webhook`

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    }),
  })

  const data = await response.json()
  return NextResponse.json({ webhookUrl, telegram: data })
}
