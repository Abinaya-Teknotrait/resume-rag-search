export function cleanText(text: string): string {
  if (!text) return '';

  // Normalize newlines and remove control characters
  let normalized = text.replace(/\r\n?/g, '\n').replace(/[\x00-\x1F\x7F]/g, '');

  const lines = normalized
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const dedupedLines: string[] = [];
  for (const line of lines) {
    if (dedupedLines.length === 0 || dedupedLines[dedupedLines.length - 1] !== line) {
      dedupedLines.push(line);
    }
  }

  normalized = dedupedLines.join('\n');

  // Remove stray special symbols while preserving punctuation and structure
  normalized = normalized.replace(/[\u0000-\u001F\u007F]/g, '');

  return normalized.trim();
}
