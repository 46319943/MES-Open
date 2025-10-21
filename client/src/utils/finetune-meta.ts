import type { FineTuneRecord } from 'src/local/models/fine-tune.model';
import type { OutputFormat, OutputFormatType } from '@/shared/models/output-format.model';
import type { Prompt } from '@/shared/models/prompt.model';
import outputFormatApi from '@/shared/sdk/output-format.api';
import promptApi from '@/shared/sdk/prompt.api';

/**
 * Extracts and fetches the prompt associated with a fine-tune record
 * @param fineTune - The fine-tune record containing metadata
 * @returns Promise resolving to the Prompt object
 * @throws Error if no prompt ID is found in metadata or if API call fails
 */
export async function getPromptFromFineTune(fineTune: FineTuneRecord): Promise<Prompt> {
  const promptId = fineTune.meta?.promptId;
  if (!promptId) {
    throw new Error('No prompt ID found in fine-tune metadata');
  }

  return await promptApi.getPrompt(promptId);
}

/**
 * Extracts and fetches the output format associated with a fine-tune record
 * @param fineTune - The fine-tune record containing metadata
 * @returns Promise resolving to the OutputFormat object
 * @throws Error if no output format ID is found in metadata or if API call fails
 */
export async function getOutputFormatFromFineTune(fineTune: FineTuneRecord): Promise<OutputFormat> {
  const outputFormatId = fineTune.meta?.outputFormatId;
  if (!outputFormatId) {
    throw new Error('No output format ID found in fine-tune metadata');
  }

  return await outputFormatApi.getOutputFormat(outputFormatId);
}

/**
 * Extracts the output format type from a fine-tune record's metadata
 * @param fineTune - The fine-tune record containing metadata
 * @returns The output format type ('sense-prioritized', 'order-preserving', or 'cot')
 * @throws Error if no output format type is found in metadata
 */
export function getOutputFormatTypeFromFineTune(fineTune: FineTuneRecord): OutputFormatType {
  const outputFormatType = fineTune.meta?.output_format_type;
  if (!outputFormatType) {
    throw new Error('No output format type found in fine-tune metadata');
  }

  // Validate that the type is one of the expected values
  if (!['sense-prioritized', 'order-preserving', 'cot'].includes(outputFormatType)) {
    throw new Error(`Invalid output format type: ${outputFormatType}`);
  }

  return outputFormatType as OutputFormatType;
}
