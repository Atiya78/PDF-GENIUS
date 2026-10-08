import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

export function isPublicIp(value: string): boolean {
  if (isIP(value) === 4) {
    const [a, b, c] = value.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(value) !== 6) return false;
  const address = value.toLowerCase().replace(/\d+\.\d+\.\d+\.\d+$/, v => {
    const [a, b, c, d] = v.split(".").map(Number);
    return `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  });
  const [left, right] = address.split("::");
  const l = left ? left.split(":") : [], r = right ? right.split(":") : [];
  const words = (right !== undefined ? [...l, ...Array(8 - l.length - r.length).fill("0"), ...r] : l).map(v => parseInt(v, 16));
  if (words.slice(0, 5).every(v => v === 0) && words[5] === 0xffff)
    return isPublicIp(`${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`);
  // Only globally routed unicast; exclude IETF special-use, 6to4, and both
  // documentation prefixes. This also excludes local/link-local/multicast.
  return (words[0] & 0xe000) === 0x2000 && words[0] !== 0x2002 &&
    !(words[0] === 0x2001 && (words[1] < 0x0200 || words[1] === 0x0db8)) &&
    !(words[0] === 0x3fff && (words[1] & 0xf000) === 0);
}

export function validatePublicUrl(value: unknown): URL {
  if (typeof value !== "string" || value.length > 2048) throw new Error("Enter a public HTTP or HTTPS URL of at most 2,048 characters.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a complete HTTP or HTTPS URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Only public HTTP/HTTPS URLs without embedded credentials are supported.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports 80 and 443 are supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host || /(^|\.)(localhost|local|internal|invalid|test|onion)$/.test(host) ||
    (!host.includes(".") && !host.includes(":")) || (isIP(host) && !isPublicIp(host)))
    throw new Error("Private, internal and reserved network addresses are not allowed.");
  url.hash = "";
  return url;
}

export function urlSourceFile(value: string): Express.Multer.File {
  const url = validatePublicUrl(value).href;
  const buffer = Buffer.from(url);
  // A source reference for the existing job pipeline, not rendered HTML.
  // URL mode fetches the real page before conversion.
  return { fieldname: "file", originalname: "webpage.html", encoding: "7bit",
    mimetype: "text/html", size: buffer.length, buffer } as Express.Multer.File;
}

interface FetchedResource { body: Buffer; contentType: string; url: string; }
type Address = { address: string; family: number };

export class PublicPageFetcher {
  private readonly deadline = Date.now() + 30_000;
  private requests = 0;
  private bytes = 0;
  private sizeError = "";
  private readonly addresses = new Map<string, Promise<Address>>();

  private async address(host: string): Promise<Address> {
    const cached = this.addresses.get(host);
    if (cached) return cached;
    const resolve = (async () => {
      const records = isIP(host) ? [{ address: host, family: isIP(host) }]
        : await new Promise<Address[]>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Website DNS lookup timed out.")), 5000);
          lookup(host, { all: true, verbatim: true }).then(resolve, reject).finally(() => clearTimeout(timer));
        });
      if (!records.length || records.some(record => !isPublicIp(record.address)))
        throw new Error("This hostname resolves to a private, internal or reserved address.");
      return records.find(record => record.family === 4) ?? records[0];
    })();
    this.addresses.set(host, resolve);
    return resolve;
  }

  async fetch(value: string, maxBytes: number, redirects = 0): Promise<FetchedResource> {
    if (++this.requests > 40) {
      this.sizeError = "This page exceeds the limit of 40 resource requests.";
      throw new Error(this.sizeError);
    }
    if (Date.now() >= this.deadline) {
      this.sizeError = "Fetching the webpage took too long.";
      throw new Error(this.sizeError);
    }
    const url = validatePublicUrl(value);
    const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
    const address = await this.address(host);
    if (Date.now() >= this.deadline) throw new Error("Fetching the webpage took too long.");
    const result = await new Promise<FetchedResource | { redirect: string }>((resolve, reject) => {
      const transport = url.protocol === "https:" ? https : http;
      // Node connects to the validated address, not a second DNS lookup:
      // rebinding cannot change the socket destination. TLS still verifies
      // the original hostname; no credentials/cookies are forwarded.
      const connectionOptions: https.RequestOptions & { autoSelectFamily: boolean } = {
        method: "GET", autoSelectFamily: false,
        lookup: (_host, _options, callback) => callback(null, address.address, address.family),
        headers: { "User-Agent": "PDFGenius-HTML-Converter/1.0", Accept: "*/*", "Accept-Encoding": "identity" },
      };
      const request = transport.request(url, connectionOptions, response => {
        const status = response.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          try {
            const redirect = new URL(response.headers.location, url).href;
            response.destroy();
            resolve({ redirect });
          } catch {
            response.destroy();
            reject(new Error("The website returned an invalid redirect URL."));
          }
          return;
        }
        if (status < 200 || status >= 300) {
          response.destroy();
          reject(new Error(`The website returned HTTP ${status}. Check that the URL is publicly accessible.`));
          return;
        }
        if (Number(response.headers["content-length"] ?? 0) > maxBytes) {
          this.sizeError = "The webpage or one of its resources exceeds the allowed size.";
          response.destroy();
          reject(new Error(this.sizeError));
          return;
        }
        const encoding = response.headers["content-encoding"];
        const decoder = encoding === "gzip" ? createGunzip() : encoding === "br" ? createBrotliDecompress()
          : encoding === "deflate" ? createInflate() : null;
        const stream = decoder ? response.pipe(decoder) : response;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          this.bytes += chunk.length;
          if (size > maxBytes || this.bytes > 12 * 1024 * 1024) {
            this.sizeError = "The webpage exceeds the size limit (5 MB HTML, 2 MB per asset, 12 MB total).";
            stream.destroy(new Error(this.sizeError));
            response.destroy();
            request.destroy();
          } else chunks.push(chunk);
        });
        stream.on("error", reject);
        response.on("error", reject);
        response.on("aborted", () => reject(new Error("The website closed the connection before the page finished.")));
        stream.on("end", () => resolve({
          body: Buffer.concat(chunks),
          contentType: response.headers["content-type"] ?? "application/octet-stream",
          url: url.href,
        }));
      });
      const timer = setTimeout(() => request.destroy(new Error("The website request timed out.")),
        Math.max(1, Math.min(10_000, this.deadline - Date.now())));
      request.on("close", () => clearTimeout(timer));
      request.on("error", reject);
      request.end();
    });
    if ("redirect" in result) {
      if (redirects >= 3) throw new Error("The website redirected too many times.");
      // Each redirect is revalidated and uses a pinned public address.
      return this.fetch(result.redirect, maxBytes, redirects + 1);
    }
    return result;
  }

  assertSizeLimits(): void { if (this.sizeError) throw new Error(this.sizeError); }

  async html(value: string) {
    const result = await this.fetch(value, 5 * 1024 * 1024);
    if (!/^text\/html|^application\/xhtml\+xml/i.test(result.contentType))
      throw new Error("The URL did not return an HTML page. Use the file-upload mode for HTML files.");
    const charset = result.contentType.match(/charset=["']?([^;"'\s]+)/i)?.[1] ?? "utf-8";
    let html: string;
    try { html = new TextDecoder(charset).decode(result.body); } catch { throw new Error("The webpage uses an unsupported text encoding."); }
    const escapedUrl = result.url.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    // Insert before any source base tag so relative resources resolve to the
    // final public URL. All requests still go through the guarded transport.
    const base = `<base href="${escapedUrl}">`;
    html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, head => `${head}${base}`) : `${base}${html}`;
    return html;
  }
}
