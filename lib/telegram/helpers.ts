import type { Context } from "grammy"

const TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES = 20 * 1024 * 1024

/** Downloads whatever media/document is attached to the current message. */
export async function downloadIncomingFile(ctx: Context): Promise<{ buffer: Buffer; contentType: string }> {
  const file = await ctx.getFile()

  if (file.file_size && file.file_size > TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES) {
    throw new Error("This file is larger than Telegram's 20MB bot download limit.")
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file from Telegram: HTTP ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get("content-type") ?? "application/octet-stream"

  return { buffer, contentType }
}

/** Telegram captions/messages cap out at 4096 chars; split long AI replies safely. */
export function splitForTelegram(text: string, chunkSize = 4000): string[] {
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, chunkSize))
    remaining = remaining.slice(chunkSize)
  }
  return chunks
}
