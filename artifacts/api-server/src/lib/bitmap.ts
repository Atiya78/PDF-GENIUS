import sharp from "sharp";

/** Standard 24-bit Windows BMP: opaque BGR pixels, padded bottom-up rows. */
export async function encodeBitmap(bytes: Buffer) {
  const { data, info } = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .rotate().flatten({ background: "#ffffff" }).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const stride = Math.ceil(info.width * 3 / 4) * 4;
  const result = Buffer.alloc(54 + stride * info.height);
  result.write("BM"); result.writeUInt32LE(result.length, 2); result.writeUInt32LE(54, 10);
  result.writeUInt32LE(40, 14); result.writeInt32LE(info.width, 18); result.writeInt32LE(info.height, 22);
  result.writeUInt16LE(1, 26); result.writeUInt16LE(24, 28); result.writeUInt32LE(stride * info.height, 34);
  result.writeInt32LE(2835, 38); result.writeInt32LE(2835, 42);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const source = (y * info.width + x) * info.channels, target = 54 + (info.height - y - 1) * stride + x * 3;
    result[target] = data[source + 2]; result[target + 1] = data[source + 1]; result[target + 2] = data[source];
  }
  return result;
}

/** Decode common uncompressed BMP inputs without handing unsupported bytes to Sharp. */
export async function normalizeBitmap(bytes: Buffer) {
  if (bytes.subarray(0, 2).toString() !== "BM") return bytes;
  if (bytes.length < 54) throw new Error("This BMP file is incomplete.");
  const offset = bytes.readUInt32LE(10), width = bytes.readInt32LE(18), signedHeight = bytes.readInt32LE(22);
  const height = Math.abs(signedHeight), bits = bytes.readUInt16LE(28), compression = bytes.readUInt32LE(30);
  if (bytes.readUInt32LE(14) < 40 || width < 1 || height < 1 || width * height > 40_000_000 || ![24, 32].includes(bits) || compression !== 0)
    throw new Error("Use an uncompressed 24-bit or 32-bit BMP, or save this image as PNG.");
  const stride = Math.ceil(width * bits / 32) * 4;
  if (offset < 54 || offset + stride * height > bytes.length) throw new Error("This BMP file has incomplete pixel data.");
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = offset + (signedHeight > 0 ? height - y - 1 : y) * stride + x * (bits / 8), target = (y * width + x) * 3;
    rgb[target] = bytes[source + 2]; rgb[target + 1] = bytes[source + 1]; rgb[target + 2] = bytes[source];
  }
  return sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer();
}
