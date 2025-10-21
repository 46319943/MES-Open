import type { Prompt } from '@/shared/models/prompt.model';

/**
 * Processes a prompt template by replacing placeholders with actual data.
 *
 * @param prompt - The prompt object containing the template content
 * @param inputText - The text to replace the {{ INPUT }} placeholder
 * @param examplesText - The text to replace the {{ EXAMPLES }} placeholder (if not empty)
 * @returns The processed prompt with placeholders replaced
 */
export function processPromptTemplate(
  prompt: Prompt,
  inputText: string,
  examplesText: string = '',
): string {
  let processedContent = prompt.content;

  // Replace {{ INPUT }} placeholder with the actual input text
  processedContent = processedContent.replace(/\{\{\s*INPUT\s*\}\}/g, inputText);

  // Replace {{ EXAMPLES }} placeholder with examplesText if provided, otherwise remove it
  if (examplesText !== '') {
    processedContent = processedContent.replace(/\{\{\s*EXAMPLES\s*\}\}/g, examplesText);
  } else {
    processedContent = processedContent.replace(/\{\{\s*EXAMPLES\s*\}\}/g, '');
  }

  // Clean up any extra whitespace that might result from removing EXAMPLES
  processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return processedContent;
}
