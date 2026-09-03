const MAX_DOWNLOAD_BYTES = 45 * 1024 * 1024 // stay under Telegram's 50MB bot upload limit

export interface DownloadedFile {
  buffer: Buffer
  contentType: string
  fileName: string
}

/** Guards against SSRF: only plain http(s) URLs to public hosts are allowed. */
function assertSafeUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported")
  }

  const hostname = url.hostname.toLowerCase()
  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"]
  const isPrivateIp =
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname)

  if (blockedHosts.includes(hostname) || isPrivateIp) {
    throw new Error("Refusing to fetch internal/private network addresses")
  }
}

function guessFileName(url: string, contentType: string) {
  const pathname = new URL(url).pathname
  const last = pathname.split("/").filter(Boolean).pop()
  if (last && last.includes(".")) return last

  const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin"
  return `download.${ext}`
}

/** Downloads a remote file into memory, enforcing a size cap and basic SSRF protection. */
export async function downloadMediaFromUrl(url: string): Promise<DownloadedFile> {
  assertSafeUrl(url)

  const response = await fetch(url, { redirect: "follow" })
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`)
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength && Number(contentLength) > MAX_DOWNLOAD_BYTES) {
    throw new Error("File is larger than the 45MB limit")
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("File is larger than the 45MB limit")
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream"

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    fileName: guessFileName(url, contentType),
  }
}
