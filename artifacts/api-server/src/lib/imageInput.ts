import heicConvert from "heic-convert";
import { normalizeBitmap } from "./bitmap";

let codecQueue = Promise.resolve();

export async function normalizeImageInput(input: Buffer, extension?: string): Promise<Buffer> {
  const brands = input.subarray(4, 48).toString("ascii");
  if (!["heic", "heif"].includes(extension ?? "") && !/ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/.test(brands)) return normalizeBitmap(input);
  if (input.length > 25 * 1024 * 1024) throw new Error("HEIC/HEIF input must be 25 MB or smaller.");
  // Walk actual ISO-BMFF properties, not matching bytes inside compressed
  // image data. Handle ordinary, 64-bit and extends-to-end box sizes.
  let extents = 0;
  const walk = (start: number, end: number, depth: number) => {
    if (depth > 8) throw new Error("The HEIC/HEIF metadata is malformed.");
    for (let offset = start; offset + 8 <= end;) {
      let size = input.readUInt32BE(offset), header = 8;
      const type = input.toString("ascii", offset + 4, offset + 8);
      if (size === 1) {
        if (offset + 16 > end) throw new Error("The HEIC/HEIF metadata is incomplete.");
        const large = input.readBigUInt64BE(offset + 8);
        if (large > BigInt(end - offset)) throw new Error("The HEIC/HEIF metadata is incomplete.");
        size = Number(large); header = 16;
      } else if (size === 0) size = end - offset;
      if (size < header || offset + size > end) throw new Error("The HEIC/HEIF metadata is incomplete.");
      if (type === "ispe") {
        if (size < header + 12) throw new Error("The HEIC/HEIF image dimensions are invalid.");
        const width = input.readUInt32BE(offset + header + 4), height = input.readUInt32BE(offset + header + 8);
        if (!width || !height) throw new Error("The HEIC/HEIF image dimensions are invalid.");
        if (width * height > 40_000_000) throw new Error("This HEIC/HEIF image exceeds 40 megapixels. Choose a smaller photo.");
        extents++;
      } else if (["meta", "iprp", "ipco"].includes(type)) {
        walk(offset + header + (type === "meta" ? 4 : 0), offset + size, depth + 1);
      }
      offset += size;
    }
  };
  walk(0, input.length, 0);
  if (!extents) throw new Error("The HEIC/HEIF image dimensions could not be read.");
  const previous = codecQueue;
  let release!: () => void;
  codecQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    // Decode losslessly to PNG; Sharp handles the requested final output.
    return Buffer.from(await heicConvert({ buffer: input, format: "PNG" }));
  } catch (error) {
    throw new Error(`This HEIC/HEIF image could not be decoded. Check that it is a supported, undamaged photo. ${error instanceof Error ? error.message : ""}`);
  } finally { release(); }
}

export function imageQuality(value: unknown, fallback = 90): number {
  const quality = value ?? fallback;
  if (typeof quality !== "number" || !Number.isInteger(quality) || quality < 10 || quality > 100)
    throw new Error("Image quality must be a whole number from 10 to 100.");
  return quality;
}
