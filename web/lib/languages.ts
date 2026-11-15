export const TARGET_LANGUAGES = {
  fr: "French",
  es: "Spanish",
  pt: "Brazilian Portuguese",
  zh: "Simplified Chinese",
  hi: "Hindi",
  ta: "Tamil",
} as const;

export type TargetLanguage = keyof typeof TARGET_LANGUAGES;

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TARGET_LANGUAGES, value);
}
