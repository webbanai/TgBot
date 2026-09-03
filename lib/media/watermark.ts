import type { BotUser } from "@/lib/db/schema"
import type { WatermarkPosition } from "@/lib/telegram/types"
import { readWatermarkLogo } from "@/lib/media/watermark-storage"
import { watermarkImage } from "@/lib/media/watermark-image"
import { watermarkVideo } from "@/lib/media/watermark-video"

/** Applies the user's saved watermark preferences to a photo or video buffer. */
export async function applyUserWatermark(
  user: BotUser,
  media: { buffer: Buffer; kind: "photo" | "video" },
): Promise<Buffer> {
  const logoBuffer = user.watermarkBlobPathname ? await readWatermarkLogo(user.watermarkBlobPathname) : null
  const position = user.watermarkPosition as WatermarkPosition
  const opacity = user.watermarkOpacity

  if (media.kind === "photo") {
    return watermarkImage({
      imageBuffer: media.buffer,
      logoBuffer,
      text: logoBuffer ? null : "WATERMARK",
      position,
      opacity,
    })
  }

  return watermarkVideo({
    videoBuffer: media.buffer,
    logoBuffer,
    text: logoBuffer ? null : "WATERMARK",
    position,
    opacity,
  })
}
