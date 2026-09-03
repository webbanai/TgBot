import { tool } from "ai"
import { z } from "zod"
import { downloadMediaFromUrl } from "@/lib/media/download"

export interface DownloadMediaContext {
  /** Sends a downloaded file back to the requesting chat. */
  sendFile: (input: { buffer: Buffer; fileName: string; contentType: string }) => Promise<void>
}

/**
 * AI tool: downloads any file from a direct URL (image, video, audio, pdf,
 * archive, etc.) and delivers it straight into the Telegram chat.
 */
export function createDownloadMediaTool(ctx: DownloadMediaContext) {
  return tool({
    description:
      "Download a media or file from a direct URL (image, video, audio, document, etc.) and send it to the user in this chat. Only use this for direct file links, not for web pages that merely link to media.",
    inputSchema: z.object({
      url: z.string().url().describe("Direct URL to the file to download"),
    }),
    execute: async ({ url }) => {
      const file = await downloadMediaFromUrl(url)
      await ctx.sendFile(file)
      return {
        success: true,
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.buffer.byteLength,
      }
    },
  })
}
