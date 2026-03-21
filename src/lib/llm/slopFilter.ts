// Strips common AI writing patterns from LLM output.
// Runs as post-processing on any generated text regardless of provider.

const SLOP_PATTERNS: [RegExp, string][] = [
  // Filler openers
  [/^(Certainly|Of course|Absolutely|Sure thing|Great question)[!,.]?\s*/gmi, ''],
  [/^(Here's|Here is) (the|a|an|your) .*?:\s*/gmi, ''],
  [/^(Let me|Allow me to|I'd be happy to) .*?\.\s*/gmi, ''],

  // Hedging / softeners
  [/\bIt's (important|worth|crucial) to note that\b/gi, ''],
  [/\bIt (should|is important to|bears mentioning|is worth noting) (be noted|note|that)\b/gi, ''],
  [/\bAs (we can see|noted|mentioned|discussed|observed),?\s*/gi, ''],

  // Overused intensifiers
  [/\b(significantly|dramatically|substantially|remarkably|notably)\b/gi, ''],

  // AI tells
  [/\b(delve|tapestry|landscape|paradigm|multifaceted|holistic|synergy|leverage)\b/gi, ''],
  [/\bin (today's|the current) (landscape|environment|climate)\b/gi, ''],
  [/\b(game-?changer|double-?edged sword|tip of the iceberg)\b/gi, ''],

  // Unnecessary transitions
  [/^(Furthermore|Moreover|Additionally|In addition),?\s*/gm, ''],
  [/^(That being said|Having said that|With that in mind|That said),?\s*/gm, ''],

  // Closing fluff
  [/\b(In conclusion|To summarize|In summary|Overall),?\s*/gi, ''],
  [/\bI hope this (helps|is useful|answers).*$/gmi, ''],
  [/\bFeel free to .*$/gmi, ''],
  [/\bLet me know if .*$/gmi, ''],

  // Emoji (shouldn't appear in SITREP but just in case)
  [/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''],

  // Clean up resulting double spaces and empty lines
  [/  +/g, ' '],
  [/\n{3,}/g, '\n\n'],
];

export function filterSlop(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SLOP_PATTERNS) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    } else {
      result = result.replace(pattern, replacement);
    }
  }
  // Trim leading/trailing whitespace on each line
  result = result
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();

  return result;
}
