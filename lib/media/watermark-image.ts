import sharp from "sharp"
import type { WatermarkPosition } from "@/lib/telegram/types"

const MARGIN_RATIO = 0.03 // margin as a fraction of the shortest image side
const LOGO_SIZE_RATIO = 0.22 // watermark logo width as a fraction of image width
const TEXT_HEIGHT_RATIO = 0.045 // watermark text height as a fraction of image height

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Computes the top-left pixel offset for an overlay of a given size. */
function resolveOffset(
  position: WatermarkPosition,
  canvas: { width: number; height: number },
  overlay: { width: number; height: number },
  margin: number,
) {
  const maxLeft = canvas.width - overlay.width
  const maxTop = canvas.height - overlay.height

  const left = {
    "top-left": margin,
    "bottom-left": margin,
    "top-right": maxLeft - margin,
    "bottom-right": maxLeft - margin,
    center: Math.round((canvas.width - overlay.width) / 2),
  }[position]

  const top = {
    "top-left": margin,
    "top-right": margin,
    "bottom-left": maxTop - margin,
    "bottom-right": maxTop - margin,
    center: Math.round((canvas.height - overlay.height) / 2),
  }[position]

  return {
    left: Math.min(Math.max(left, 0), Math.max(maxLeft, 0)),
    top: Math.min(Math.max(top, 0), Math.max(maxTop, 0)),
  }
}

/**
 * Applies either a logo image watermark or a text watermark to an image
 * buffer, returning a re-encoded JPEG buffer.
 */
export async function watermarkImage(input: {
  imageBuffer: Buffer
  logoBuffer?: Buffer | null
  text?: string | null
  position: WatermarkPosition
  opacity: number
}): Promise<Buffer> {
  const { imageBuffer, logoBuffer, text, position, opacity } = input

  const base = sharp(imageBuffer).rotate() // normalize EXIF orientation
  const metadata = await base.metadata()
  const width = metadata.width ?? 1024
  const height = metadata.height ?? 1024
  const margin = Math.round(Math.min(width, height) * MARGIN_RATIO)

  let overlayBuffer: Buffer
  let overlayWidth: number
  let overlayHeight: number

  if (logoBuffer) {
    const logoWidth = Math.max(32, Math.round(width * LOGO_SIZE_RATIO))
    const resizedLogo = sharp(logoBuffer).resize({ width: logoWidth, withoutEnlargement: true })
    const logoMeta = await resizedLogo.metadata()
    overlayWidth = logoMeta.width ?? logoWidth
    overlayHeight = logoMeta.height ?? logoWidth

    // Scale the alpha channel by `opacity` (RGB bands untouched) to fade the
    // logo without affecting its colors.
    overlayBuffer = await resizedLogo
      .ensureAlpha()
      .linear([1, 1, 1, opacity], [0, 0, 0, 0])
      .png()
      .toBuffer()
  } else {
    const label = escapeXml(text?.trim() || "WATERMARK")
    const fontSize = Math.max(14, Math.round(height * TEXT_HEIGHT_RATIO))
    overlayWidth = Math.round(label.length * fontSize * 0.62) + 24
    overlayHeight = fontSize + 20

    const svg = `
      <svg width="${overlayWidth}" height="${overlayHeight}" xmlns="http://www.w3.org/2000/svg">
        <text x="12" y="${fontSize}" font-family="sans-serif" font-weight="700" font-size="${fontSize}"
          fill="white" fill-opacity="${opacity}" stroke="black" stroke-opacity="${opacity * 0.7}" stroke-width="2">${label}</text>
      </svg>`
    overlayBuffer = Buffer.from(svg)
  }

  const { left, top } = resolveOffset(
    position,
    { width, height },
    { width: overlayWidth, height: overlayHeight },
    margin,
  )

  return base
    .composite([{ input: overlayBuffer, left, top }])
    .jpeg({ quality: 92 })
    .toBuffer()
}
