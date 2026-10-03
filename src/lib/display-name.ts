// Suggestions come exclusively from the signed-in user's saved public names.
// An explicitly edited field, including an empty one, always takes precedence.
export function resolveDisplayName(value: string, edited: boolean, suggestion: string): string {
  return edited || value ? value : suggestion;
}

export function suggestDisplayName(...candidates: (string | null | undefined)[]): string {
  return candidates.find((name) => name?.trim())?.trim() ?? "";
}
