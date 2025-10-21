/**
 * Formats a camelCase or PascalCase string by adding spaces between words
 * and capitalizing the first letter of the resulting string.
 * @param input The string to format
 * @returns The formatted string
 */
export function formatCamelCaseString(input: string): string {
  // Split the string into parts using a more sophisticated regex pattern
  const parts = input.split(/(?<=[A-Z]{2,})(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z])/);

  // Join parts with spaces and clean up
  return parts
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (str) => str.toUpperCase());
}
