export interface TelegramFrom {
  id: number
  username?: string
  first_name?: string
  last_name?: string
  language_code?: string
}

export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
