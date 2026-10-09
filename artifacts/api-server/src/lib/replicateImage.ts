const API = "https://api.replicate.com/v1";

/** Run a documented model; never substitute a resize or color filter for AI. */
export async function removeBackgroundWithReplicate(image: Buffer, token: string) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const response = await fetch(`${API}/predictions`, {
    method: "POST", headers: { ...headers, Prefer: "wait" }, signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      version: "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      input: { image: `data:image/png;base64,${image.toString("base64")}` },
    }),
  });
  if (!response.ok) throw new Error("The AI image provider could not start processing. Check its connection and account usage allowance.");
  let result = await response.json() as { id?: string; status: string; output?: string | string[] };
  const started = Date.now();
  while (["starting", "processing"].includes(result.status) && Date.now() - started < 180_000) {
    if (!result.id || !/^[a-z0-9]+$/i.test(result.id)) throw new Error("The image provider returned an invalid processing reference.");
    await new Promise(resolve => setTimeout(resolve, 2000));
    const poll = await fetch(`${API}/predictions/${result.id}`, { headers, signal: AbortSignal.timeout(15_000) });
    if (!poll.ok) throw new Error("Unable to check AI processing. Please try again.");
    result = await poll.json() as typeof result;
  }
  if (result.status !== "succeeded") throw new Error("AI background removal did not complete. Try a smaller image or retry later.");
  const output = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!output) throw new Error("The AI provider returned no image.");
  const url = new URL(output);
  if (url.protocol !== "https:" || !(url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery")))
    throw new Error("The image provider returned an unexpected download location.");
  const download = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" });
  if (!download.ok || !download.body) throw new Error("The processed image could not be downloaded.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of download.body) {
    size += chunk.length;
    if (size > 128 * 1024 * 1024) throw new Error("The processed image exceeds the output size limit.");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
