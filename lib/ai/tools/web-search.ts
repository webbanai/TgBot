import { tool } from "ai"
import { z } from "zod"

interface ExaSearchResult {
  title: string | null
  url: string
  publishedDate: string | null
  text: string | null
}

interface ExaSearchResponse {
  results: ExaSearchResult[]
}

/** AI tool: searches the live web via Exa and returns compact summaries for the model to cite. */
export const webSearchTool = tool({
  description:
    "Search the live web for current information (news, facts, prices, docs, etc). Use this whenever the user asks about something that might have changed recently or that you are not certain about.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    numResults: z.number().int().min(1).max(8).optional().describe("How many results to return (default 5)"),
  }),
  execute: async ({ query, numResults }) => {
    const apiKey = process.env.EXA_API_KEY
    if (!apiKey) {
      return { error: "Web search is not configured (missing EXA_API_KEY)." }
    }

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: numResults ?? 5,
        type: "auto",
        contents: { text: { maxCharacters: 800 } },
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(`Exa search failed: HTTP ${response.status} ${body.slice(0, 200)}`)
    }

    const data = (await response.json()) as ExaSearchResponse

    return {
      results: data.results.map((r) => ({
        title: r.title ?? "Untitled",
        url: r.url,
        publishedDate: r.publishedDate,
        snippet: r.text?.slice(0, 600) ?? "",
      })),
    }
  },
})
