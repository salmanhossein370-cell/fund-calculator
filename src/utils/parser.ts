/**
 * Extracts the numeric value inside parentheses associated with the keyword "shahriyar" (case-insensitive).
 * Example: "shahidul (shahriyar 20.50) (dukan 7)" -> 20.5
 * If multiple are found, it sums them up or returns the first. Summing ensures all items are accounted for.
 */
export function extractShahriyarValue(note: string): number {
  if (!note) return 0;
  
  // Match groups like (shahriyar 123.45) or (shahriyar 10)
  // We use [0-9]+(?:\.[0-9]+)? to match decimal numbers
  const regex = /\(\s*shahriyar\s+([0-9]+(?:\.[0-9]+)?)\s*\)/gi;
  let total = 0;
  let match;
  
  // Since we use global flag, reset index
  regex.lastIndex = 0;
  
  while ((match = regex.exec(note)) !== null) {
    if (match[1]) {
      total += parseFloat(match[1]);
    }
  }
  
  return total;
}

/**
 * Checks if a note contains the "(shahriyar X)" pattern.
 */
export function hasShahriyarValue(note: string): boolean {
  if (!note) return false;
  const regex = /\(\s*shahriyar\s+[0-9]+(?:\.[0-9]+)?\s*\)/i;
  return regex.test(note);
}
