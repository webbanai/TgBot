import { groq } from "@ai-sdk/groq"
import { ToolLoopAgent, type ModelMessage } from "ai"
import { webSearchTool } from "@/lib/ai/tools/web-search"
import { createDownloadMediaTool, type DownloadMediaContext } from "@/lib/ai/tools/download-media"

const MODEL_ID = "openai/gpt-oss-120b"

const SYSTEM_INSTRUCTIONS = `You are a helpful, friendly assistant living inside a Telegram bot.

Guidelines:
- Keep replies concise and use plain text (no markdown tables). Telegram renders basic markdown: *bold*, _italic_, \`code\`.
- Use the web_search tool whenever the user asks about current events, facts you're unsure of, or anything time-sensitive.
- Use the download_media tool when the user gives a direct URL to a file and wants it downloaded or sent to them.
- To add a watermark to a photo or video, tell the user to simply send the photo/video with the caption "watermark" (or use /setwatermark first to set a custom logo) — you do not have a watermark tool yourself.
- If a tool fails, briefly explain the failure in plain language, don't expose raw stack traces.
- Never claim to browse the web or access files without actually calling a tool.`

/** Builds a fresh agent instance scoped to one chat's tool context. */
export function createAgent(downloadCtx: DownloadMediaContext) {
  return new ToolLoopAgent({
    model: groq(MODEL_ID),
    instructions: SYSTEM_INSTRUCTIONS,
    tools: {
      web_search: webSearchTool,
      download_media: createDownloadMediaTool(downloadCtx),
    },
  })
}

export async function runAgent(input: {
  history: ModelMessage[]
  message: string
  downloadCtx: DownloadMediaContext
}) {
  const agent = createAgent(input.downloadCtx)

  const result = await agent.generate({
    messages: [...input.history, { role: "user", content: input.message }],
  })

  return result
}
