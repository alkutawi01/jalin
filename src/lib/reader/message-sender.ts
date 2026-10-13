/**
 * In a message box (:::mesej) every line is "name: what they wrote". The reader tells the sender from the words only by the colon, so
 * the name is set in bold. This finds the name at the start of a line: one word, or two ("Mak Cik"), up to the first colon that is
 * followed by a space or the end of the line. A line without such a name is left as it is.
 */
export function splitMessageSender(text: string): { sender: string; rest: string } | null {
  const match = /^([^\s:]+(?:[  ][^\s:]+)?):(?=\s|$)/.exec(text);
  if (!match || match[1]!.length > 40) return null;
  return { sender: match[1]!, rest: text.slice(match[0].length) };
}
