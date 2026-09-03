export interface TelegramBotInfo {
  username: string
  firstName: string
}

/** Fetches basic bot identity from Telegram, used for the status page link. */
export async function getBotInfo(): Promise<TelegramBotInfo | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" })
    const data = await response.json()
    if (!data.ok) return null

    return { username: data.result.username, firstName: data.result.first_name }
  } catch {
    return null
  }
}
