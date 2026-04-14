/**
 * Joins inline script/style content from string or array format into a
 * single string. WordPress inline scripts (before/after/extraData) can
 * be stored as arrays of strings or single strings.
 */
export function joinScriptContent(
  content: (string | null | undefined)[] | string | null | undefined,
): string {
  if (!content) return '';
  if (Array.isArray(content)) return content.join('');
  return content;
}
