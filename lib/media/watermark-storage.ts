import { del, get, put } from "@vercel/blob"

/**
 * Persists a user's watermark logo image in the private Blob store and
 * returns its pathname (used later to fetch it back with `get()`).
 */
export async function saveWatermarkLogo(telegramId: number, buffer: Buffer, contentType: string) {
  const extension = contentType.includes("png") ? "png" : "jpg"
  const pathname = `watermark-logos/${telegramId}.${extension}`

  const blob = await put(pathname, buffer, {
    access: "private",
    contentType,
    addRandomSuffix: false,
  })

  return blob.pathname
}

/** Reads a previously saved watermark logo back into memory. Returns null if missing. */
export async function readWatermarkLogo(pathname: string): Promise<Buffer | null> {
  const result = await get(pathname, { access: "private" })
  if (!result) return null

  const chunks: Uint8Array[] = []
  for await (const chunk of result.stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks)
}

export async function deleteWatermarkLogo(pathname: string) {
  await del(pathname).catch(() => {
    // Best-effort cleanup; missing blobs are not an error for this feature.
  })
}
