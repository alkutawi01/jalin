/**
 * A note that cites a source often carries the address in full ("(https://www.lmu.de/en/about-lmu/lmu-at-a-glance/history/...)").
 * Set in the narrow margin that is a wall of characters. Each bare address becomes a link that shows only the site ("lmu.de"), so the
 * source stays one click away and the note stays readable. Links the editor already wrote on purpose are left alone: [text](address),
 * [address](address), <address> and a reference definition line ("[1]: address").
 */
const BARE_URL = /(?<!\]\()(?<![\[<])https?:\/\/[^\s)<>\]]+/g;
const TRAILING = /[.,;:!?]+$/;
const REFERENCE_DEFINITION = /^\s*\[[^\]]+\]:\s/;

export function shortenNoteLinks(text: string): string {
  return text.split("\n").map((line) => (REFERENCE_DEFINITION.test(line) ? line : shortenLine(line))).join("\n");
}

function shortenLine(line: string): string {
  return line.replace(BARE_URL, (match) => {
    const trailing = match.match(TRAILING)?.[0] ?? "";
    const url = trailing ? match.slice(0, -trailing.length) : match;
    let host: string;
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return match; }
    return `[${host}](${url})${trailing}`;
  });
}
