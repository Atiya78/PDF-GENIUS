// Audited against the web upload routes and shared processing helpers.
// Downloading workers/fonts or fetching tool availability does not upload files.
export const browserOnlyTools = [
  "Edit PDF", "Split PDF", "Rotate PDF", "Crop PDF", "Sign PDF",
  "Watermark PDF", "Add Image to PDF", "Delete PDF Pages",
  "OCR PDF",
];
export const localToolsWithOptionalUpload = ["Crop Image", "Resize Image", "Rotate Image"];
export const serverUploadTools = [
  "PDF to Word", "PDF to Excel", "PDF to PowerPoint", "PDF to Images",
  "Word to PDF", "Excel to PDF", "PowerPoint to PDF", "HTML to PDF",
  "Images to PDF", "Merge PDF", "Compress PDF", "Compress Video",
  "Lock PDF", "Unlock PDF", "Convert Image Format", "Compress Image",
  "Upscale Image", "Remove Background",
];
export const unavailableTools = ["Document Restore (coming soon)"];