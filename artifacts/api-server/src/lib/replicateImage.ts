import Replicate from "replicate";
import { ReplitConnectors } from "@replit/connectors-sdk";

export const AURA_SR_V2 = "zsxkib/aura-sr-v2:5c137257cce8d5ce16e8a334b70e9e025106b5580affed0bc7d48940b594e74c";
const REMOVE_BG = "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1";
const API_ORIGIN = "https://api.replicate.com";
const isReplitRuntime = () => Boolean(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL);
class ImageProviderError extends Error {}

function providerError(status: number) {
  if ([401, 403, 404].includes(status))
    return new ImageProviderError("The AI image connection is unavailable. Please contact support.");
  if (status === 402)
    return new ImageProviderError("The AI image provider needs an active usage allowance. Please contact support.");
  if (status === 429)
    return new ImageProviderError("The AI image provider is busy. Please try again shortly.");
  return new ImageProviderError("The AI image provider could not process the image. Please try again.");
}

export function validateReplicateImageUrl(value: string | URL): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") ||
      !(url.hostname === "api.replicate.com" || url.hostname === "replicate.delivery" || url.hostname.endsWith(".replicate.delivery")))
    throw new ImageProviderError("The AI provider returned an unexpected file location.");
  return url;
}

export function replicateOutputUrl(output: unknown): URL {
  const file = Array.isArray(output) ? output[0] : output;
  if (file && typeof file === "object" && "url" in file && typeof file.url === "function")
    return validateReplicateImageUrl(String(file.url()));
  if (typeof file === "string") return validateReplicateImageUrl(file);
  throw new ImageProviderError("The AI provider returned no image.");
}

/** SDK-managed predictions; the transport preserves the attached Replit connection. */
export function createReplicateClient(operationSignal?: AbortSignal): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  return new Replicate({
    auth: token,
    useFileOutput: true,
    fetch: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== API_ORIGIN)
        throw new ImageProviderError("The AI provider returned an unexpected API location.");
      const signals = [AbortSignal.timeout(60_000)];
      if (operationSignal) signals.push(operationSignal);
      if (init?.signal) signals.push(init.signal);
      const signal = AbortSignal.any(signals);
      signal.throwIfAborted();
      if (token || !isReplitRuntime()) {
        const response = await fetch(input, { ...init, signal, redirect: "error" });
        // Authentication rejection cannot have created a prediction. Do not
        // repeat a POST after an ambiguous timeout, 5xx or billing/rate error.
        if (response.status !== 401 || !isReplitRuntime()) return response;
        await response.body?.cancel().catch(() => {});
      }
      const headers = new Headers(init?.headers);
      headers.delete("Authorization");
      const body = init?.body;
      if (body !== undefined && body !== null && typeof body !== "string" && !(body instanceof FormData))
        throw new ImageProviderError("The AI provider could not prepare this image.");
      signal.throwIfAborted();
      const pending = new ReplitConnectors().proxy("replicate", url.pathname + url.search, {
        method: init?.method || "GET",
        headers: Object.fromEntries(headers.entries()),
        body: body ?? undefined,
      });
      // The connector SDK does not forward AbortSignal; bound our wait without
      // retrying a potentially submitted request after cancellation.
      return new Promise<Response>((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
        if (signal.aborted) abort();
      });
    },
  });
}

function modelIdentifier(version: string): `${string}/${string}` {
  const legacy: Record<string, string> = {
    "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1": REMOVE_BG,
    "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b":
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
  };
  const reference = legacy[version] || version;
  if (!/^[a-z0-9_-]+\/[a-z0-9_-]+(?::[a-f0-9]{64})?$/i.test(reference))
    throw new ImageProviderError("The AI image model is not configured correctly.");
  return reference as `${string}/${string}`;
}

export async function runReplicateImage(version: string, image: Buffer, options: Record<string, unknown> = {}): Promise<Buffer> {
  if (!process.env.REPLICATE_API_TOKEN && !isReplitRuntime())
    throw new ImageProviderError("AI image processing is not configured. Please contact support.");
  const signal = AbortSignal.timeout(180_000);
  const replicate = createReplicateClient(signal);
  let uploadId: string | undefined;
  let predictionId: string | undefined;
  let terminal = false;
  try {
    const reference = modelIdentifier(version);
    if (image.length > 100 * 1024 * 1024)
      throw new ImageProviderError("This image is too large for AI processing. Resize it first.");
    let input: string;
    if (image.length <= 256 * 1024) input = `data:image/png;base64,${image.toString("base64")}`;
    else {
      const file = await replicate.files.create(image, undefined, { signal });
      uploadId = file.id;
      if (!/^[a-z0-9_-]+$/i.test(uploadId))
        throw new ImageProviderError("The AI provider could not prepare this image.");
      input = validateReplicateImageUrl(file.urls.get).href;
    }
    const output = await replicate.run(reference, {
      input: { ...options, image: input }, wait: { mode: "poll", interval: 2000 }, signal,
    }, prediction => {
      predictionId = prediction.id;
      terminal = ["succeeded", "failed", "canceled", "aborted"].includes(prediction.status);
    });
    signal.throwIfAborted();
    const url = replicateOutputUrl(output);
    const downloadSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    const download = url.origin === API_ORIGIN
      ? await replicate.request(url, { signal: downloadSignal })
      : await fetch(url, { signal: downloadSignal, redirect: "error" });
    if (!download.ok || !download.body)
      throw new ImageProviderError("The processed image could not be downloaded.");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of download.body) {
      size += chunk.length;
      if (size > 128 * 1024 * 1024)
        throw new ImageProviderError("The processed image exceeds the output size limit.");
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof ImageProviderError) throw error;
    if (signal.aborted)
      throw new ImageProviderError("AI image processing took too long. Try a smaller image.");
    const response = (error as { response?: Response })?.response;
    if (response instanceof Response) throw providerError(response.status);
    throw new ImageProviderError("AI image processing did not complete. Please try again later.");
  } finally {
    const cleanup = createReplicateClient();
    if (!terminal && predictionId && /^[a-z0-9]+$/i.test(predictionId))
      await cleanup.predictions.cancel(predictionId, { signal: AbortSignal.timeout(10_000) }).catch(() => {});
    if (uploadId && /^[a-z0-9_-]+$/i.test(uploadId))
      await cleanup.files.delete(uploadId, { signal: AbortSignal.timeout(10_000) }).catch(() => {});
  }
}

export const removeBackgroundWithReplicate = (image: Buffer) => runReplicateImage(REMOVE_BG, image);
