import { Bot, Download, ImageIcon, MessageCircle, Search, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FeatureCard } from "@/components/feature-card"
import { getBotInfo } from "@/lib/telegram/get-bot-info"

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Conversational AI",
    description: "Natural chat powered by Groq, with memory of your recent conversation.",
  },
  {
    icon: Search,
    title: "Live web search",
    description: "Asks Exa for current facts, news, and anything time-sensitive.",
  },
  {
    icon: Download,
    title: "Media downloader",
    description: "Send a direct file URL and get it delivered straight into the chat.",
  },
  {
    icon: ImageIcon,
    title: "Photo & video watermark",
    description: "Brand your media with a custom logo or text, positioned your way.",
  },
]

export default async function Home() {
  const botInfo = await getBotInfo()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
        <section className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="size-7 text-primary" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="size-3" />
              AI-powered · Groq
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {botInfo ? `@${botInfo.username}` : "Telegram AI Assistant"}
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              A modular, tool-using Telegram bot: chat, web search, media downloads, and watermarking, all in one
              place.
            </p>
          </div>

          {botInfo && (
            <Button asChild size="lg">
              <a href={`https://t.me/${botInfo.username}`} target="_blank" rel="noopener noreferrer">
                Open in Telegram
              </a>
            </Button>
          )}
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Capabilities</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-2 text-center text-xs text-muted-foreground">
          <p>
            Webhook status:{" "}
            {botInfo ? (
              <span className="text-foreground">bot connected ✅</span>
            ) : (
              <span className="text-destructive">not configured — check TELEGRAM_BOT_TOKEN</span>
            )}
          </p>
          <p>
            First deploy? Visit{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">/api/telegram/setup</code> once to register the
            webhook with Telegram.
          </p>
        </section>
      </main>
    </div>
  )
}
