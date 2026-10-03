export function describeError(e: unknown): string {
  const err = e as { name?: string; status?: number; data?: { error?: string } | null; message?: string } | null;
  const server = err?.data && typeof err.data === "object" ? err.data.error : undefined;
  if (server) return server;
  const status = err?.status;
  if (status === 413) return "That file is too large. The limit is 20 MB.";
  if (status === 429) return "You have reached the daily limit for free generations. Please try again tomorrow.";
  if (status === 404 || status === 502 || status === 503) return "The Education service is not available right now. Please try again in a moment.";
  if (status && status >= 500) return "The server hit a problem. Please try again.";
  if (e instanceof TypeError) return "Could not reach the server. Check your connection and try again.";
  return err?.message || "Something went wrong. Please try again.";
}
