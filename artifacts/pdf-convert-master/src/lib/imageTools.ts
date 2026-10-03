import { authedFetch } from "./authedFetch";

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
}

// Load a File into an HTMLImageElement, returning the element and its object URL.
// Rejects (instead of silently failing) when the file is corrupt or unsupported.
export function loadImageFromFile(
  file: File,
): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image. The file may be corrupted or in an unsupported format."));
    };
    img.src = url;
  });
}

// Load an image element from an existing object URL (e.g. a previously edited
// blob), so chained operations can read back the current working image.
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Failed to load image. The file may be corrupted or in an unsupported format."));
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export the edited image."));
      },
      type,
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Upload an already-edited image blob to the server, returning a shareable URL.
export async function uploadImageToServer(
  blob: Blob,
  filename: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("fileName", filename);

  const res = await authedFetch("/api/uploads", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to upload image to the server.");
  }
  return data.data as UploadResult;
}

// Browser canvas can only export jpeg/png/webp. Anything else falls back to PNG.
export function mimeTypeForExtension(ext: string): string {
  switch (ext.toLowerCase().replace(".", "")) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "png":
    default:
      return "image/png";
  }
}

export function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "png";
}

const CANVAS_EXPORTABLE = ["jpg", "jpeg", "png", "webp"];

// Pick an output extension the browser canvas can actually produce.
export function exportExtension(filename: string): string {
  const ext = getExtension(filename);
  return CANVAS_EXPORTABLE.includes(ext) ? ext : "png";
}

export function withSuffix(filename: string, suffix: string, forcedExt?: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  const ext = forcedExt || (dot >= 0 ? filename.slice(dot + 1) : "png");
  return `${base}_${suffix}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
