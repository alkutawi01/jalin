/**
 * What to tell an editor when something they asked for failed.
 *
 * When the connection drops in the middle of a save, the browser itself throws, in its own words and in English:
 * "Failed to fetch" (Chrome, Edge), "NetworkError when attempting to fetch resource." (Firefox), "Load failed" (Safari). The
 * forms showed that as it was. A lost connection is now said in Malay, with what to do; any other error keeps its own message
 * (the server's words), and something that is not an error at all gets the form's fallback.
 */
export const NO_CONNECTION = "Tidak dapat berhubung dengan pelayan. Semak sambungan internet anda, kemudian cuba lagi.";

const BROWSER_NETWORK_ERROR = /failed to fetch|networkerror|load failed|network request failed|the network connection was lost|err_internet_disconnected/i;

export function errorText(error: unknown, fallback = "Ralat tidak diketahui."): string {
  if (!(error instanceof Error)) return fallback;
  if (BROWSER_NETWORK_ERROR.test(error.message)) return NO_CONNECTION;
  return error.message || fallback;
}
