export function resultFilename(name: string, mimeType: string) {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf", "application/zip": "zip",
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "image/bmp": "bmp", "image/tiff": "tiff", "image/avif": "avif",
  };
  const extension = extensions[mimeType];
  return extension ? name.replace(/\.[^./]+$/, "") + "." + extension : name;
}
