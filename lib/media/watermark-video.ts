import ffmpegPath from "@ffmpeg-installer/ffmpeg"
import ffmpeg from "fluent-ffmpeg"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { WatermarkPosition } from "@/lib/telegram/types"

ffmpeg.setFfmpegPath(ffmpegPath.path)

const MARGIN_PX = 24

function overlayExpression(position: WatermarkPosition) {
  switch (position) {
    case "top-left":
      return `${MARGIN_PX}:${MARGIN_PX}`
    case "top-right":
      return `main_w-overlay_w-${MARGIN_PX}:${MARGIN_PX}`
    case "bottom-left":
      return `${MARGIN_PX}:main_h-overlay_h-${MARGIN_PX}`
    case "center":
      return `(main_w-overlay_w)/2:(main_h-overlay_h)/2`
    case "bottom-right":
    default:
      return `main_w-overlay_w-${MARGIN_PX}:main_h-overlay_h-${MARGIN_PX}`
  }
}

/**
 * Burns a logo watermark (or a plain text label if no logo is provided)
 * into a video using ffmpeg, returning the resulting MP4 as a Buffer.
 *
 * Runs entirely against local temp files because ffmpeg needs seekable
 * file input/output, not streams.
 */
export async function watermarkVideo(input: {
  videoBuffer: Buffer
  logoBuffer?: Buffer | null
  text?: string | null
  position: WatermarkPosition
  opacity: number
}): Promise<Buffer> {
  const { videoBuffer, logoBuffer, text, position, opacity } = input

  const dir = await mkdtemp(join(tmpdir(), "wm-video-"))
  const inputPath = join(dir, "input.mp4")
  const outputPath = join(dir, "output.mp4")

  try {
    await writeFile(inputPath, videoBuffer)

    if (logoBuffer) {
      const logoPath = join(dir, "logo.png")
      await writeFile(logoPath, logoBuffer)

      await runFfmpeg((cmd) =>
        cmd
          .input(inputPath)
          .input(logoPath)
          .complexFilter([
            `[1:v]scale=iw*0.22:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
            `[0:v][wm]overlay=${overlayExpression(position)}[out]`,
          ])
          .outputOptions(["-map", "[out]", "-map", "0:a?", "-c:a", "copy", "-c:v", "libx264", "-preset", "veryfast"])
          .output(outputPath),
      )
    } else {
      const label = (text?.trim() || "WATERMARK").replace(/['\\:]/g, "")
      const fontSize = 28

      await runFfmpeg((cmd) =>
        cmd
          .input(inputPath)
          .videoFilters(
            `drawtext=text='${label}':fontcolor=white@${opacity}:fontsize=${fontSize}:box=1:boxcolor=black@${
              opacity * 0.5
            }:boxborderw=8:${textPosition(position)}`,
          )
          .outputOptions(["-c:a", "copy", "-c:v", "libx264", "-preset", "veryfast"])
          .output(outputPath),
      )
    }

    return await readFile(outputPath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function textPosition(position: WatermarkPosition) {
  switch (position) {
    case "top-left":
      return `x=${MARGIN_PX}:y=${MARGIN_PX}`
    case "top-right":
      return `x=w-text_w-${MARGIN_PX}:y=${MARGIN_PX}`
    case "bottom-left":
      return `x=${MARGIN_PX}:y=h-text_h-${MARGIN_PX}`
    case "center":
      return `x=(w-text_w)/2:y=(h-text_h)/2`
    case "bottom-right":
    default:
      return `x=w-text_w-${MARGIN_PX}:y=h-text_h-${MARGIN_PX}`
  }
}

function runFfmpeg(configure: (command: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand) {
  return new Promise<void>((resolve, reject) => {
    const command = configure(ffmpeg())
    command
      .on("error", (err) => reject(err))
      .on("end", () => resolve())
      .run()
  })
}
