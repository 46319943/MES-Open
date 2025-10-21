/**
 * Processes input text into Qwen chat template format for general completion API
 *
 * @param inputText - The user input text/prompt to be processed
 * @returns Formatted string ready for Qwen completion API
 */
export function processQwenInput(inputText: string): string {
  return `<|im_start|>user\n${inputText}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
}
