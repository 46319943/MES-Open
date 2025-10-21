export function replaceContextPlaceholders(
  prompt: string,
  context?: Record<string, string>
): string {
  if (!context) return prompt;

  let processedPrompt = prompt;
  for (const [key, value] of Object.entries(context)) {
    processedPrompt = processedPrompt.replace(
      new RegExp(`{{ *${key} *}}`, "g"),
      value
    );
  }
  return processedPrompt;
}
