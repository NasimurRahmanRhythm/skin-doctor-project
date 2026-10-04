/**
 * The first sentences of a description, for the short line under a title.
 * Cut after `maxSentences` sentence ends (. ! ?), and never past `maxChars`.
 */
export function excerpt(text: string, maxSentences = 2, maxChars = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const ends = [...flat.matchAll(/[.!?](?=\s|$)/g)];
  let cut = flat;
  if (ends.length > maxSentences) cut = flat.slice(0, (ends[maxSentences - 1].index ?? 0) + 1);
  if (cut.length <= maxChars) return cut;
  const room = cut.slice(0, maxChars);
  return `${room.slice(0, room.lastIndexOf(" ") > 0 ? room.lastIndexOf(" ") : maxChars).trimEnd()}…`;
}
