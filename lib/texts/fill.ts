// NF1: fill the words in braces in a text from lib/texts, such as {min}, with values.
// The texts are plain strings, not functions, so they can be passed from a Server
// Component to the client. A word without a value is left as it is, so a mistake shows.
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (word, name: string) =>
    name in values ? String(values[name]) : word,
  );
}
