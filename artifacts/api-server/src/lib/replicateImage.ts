import { ReplitConnectors } from "@replit/connectors-sdk";

/** Use the attached connection without retrieving, logging or caching credentials. */
async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: string | FormData } = {}) {
  // Keep direct-key deployments working, but don't let a rejected key hide an
  // attached Replit connection. Only retry explicit authentication rejection:
  // never duplicate a prediction after a timeout, rate limit or provider error.
  if (process.env.REPLICATE_API_TOKEN) {
    const response = await fetch(`https://api.replicate.com${path}`, {
      ...options, headers: { ...options.headers, Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status !== 401 || !(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL))
      return response;
    await response.body?.cancel().catch(() => {});
  }
  return new ReplitConnectors().proxy("replicate", path, options);
}

function providerError(status: number) {
  if (status === 401 || status === 403 || status === 404)
    return new Error("The AI image connection is unavailable. Please contact support.");
  if (status === 402) return new Error("The AI image provider needs an active usage allowance. Please contact support.");
  if (status === 429) return new Error("The AI image provider is busy. Please try again shortly.");
  return new Error("The AI image provider could not process the image. Please try again.");
}

export async function runReplicateImage(version: string, image: Buffer, options: Record<string, unknown> = {}) {
  let uploadId: string | undefined;
  let predictionId: string | undefined;
  let terminal = false;
  try {
    let input: string;
    if (image.length <= 256 * 1024) {
      input = `data:image/png;base64,${image.toString("base64")}`;
    } else {
      if (image.length > 100 * 1024 * 1024) throw new Error("This image is too large for AI processing. Resize it first.");
      const form = new FormData();
      form.append("content", new Blob([new Uint8Array(image)], { type: "image/png" }), "image.png");
      const uploaded = await request("/v1/files", { method: "POST", body: form });
      if (!uploaded.ok) throw providerError(uploaded.status);
      const file = await uploaded.json() as { id?: string; urls?: { get?: string } };
      uploadId = file.id;
      if (!uploadId || !/^[a-z0-9_-]+$/i.test(uploadId) || !file.urls?.get)
        throw new Error("The AI provider could not prepare this image.");
      const url = new URL(file.urls.get);
      if (url.protocol !== "https:" || !(url.hostname === "api.replicate.com" || url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery")))
        throw new Error("The AI provider returned an unexpected input location.");
      input = url.href;
    }
    const response = await request("/v1/predictions", {
      method: "POST", headers: { "Content-Type": "application/json", Prefer: "wait=10" },
      body: JSON.stringify({ version, input: { ...options, image: input } }),
    });
    if (!response.ok) throw providerError(response.status);
    let result = await response.json() as { id?: string; status: string; output?: string | string[] };
    predictionId = result.id;
    const started = Date.now();
    while (["starting", "processing"].includes(result.status) && Date.now() - started < 180_000) {
      if (!predictionId || !/^[a-z0-9]+$/i.test(predictionId)) throw new Error("The AI provider returned an invalid processing reference.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      const poll = await request(`/v1/predictions/${predictionId}`);
      if (!poll.ok) throw providerError(poll.status);
      result = await poll.json() as typeof result;
    }
    terminal = ["succeeded", "failed", "canceled"].includes(result.status);
    if (result.status !== "succeeded") throw new Error("AI image processing did not complete. Try a smaller image or retry later.");
    const output = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!output) throw new Error("The AI provider returned no image.");
    const url = new URL(output);
    if (url.protocol !== "https:" || !(url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery")))
      throw new Error("The AI provider returned an unexpected download location.");
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
  } finally {
    if (!terminal && predictionId && /^[a-z0-9]+$/i.test(predictionId))
      await request(`/v1/predictions/${predictionId}/cancel`, { method: "POST" }).catch(() => {});
    if (uploadId && /^[a-z0-9_-]+$/i.test(uploadId))
      await request(`/v1/files/${uploadId}`, { method: "DELETE" }).catch(() => {});
  }
}

export const removeBackgroundWithReplicate = (image: Buffer) =>
  runReplicateImage("95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1", image);
