import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image, 
  Code, 
  Copy, 
  Scissors, 
  Archive, 
  RotateCw,
  Minimize2,
  RefreshCw,
  Maximize2,
  TrendingUp,
  Crop,
  Pencil,
  PenTool,
  Stamp,
  ImagePlus,
  FileMinus,
  ScanText,
  Lock,
  Unlock,
  Video
} from "lucide-react";

export interface ToolConfig {
  id: string;
  title: string;
  description: string;
  acceptedFormats: string[];
  maxFileSize: string;
  buttonText: string;
  dropAreaText: string;
  fileTypeHint: string;
  outputFormat: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBgColor: string;
  iconBorderColor: string;
  category: string;
  route?: string;
  /** True while the tool is not yet available ("Coming soon"). */
  comingSoon?: boolean;
  /** Longer explanation shown on the tool's coming-soon screen. */
  comingSoonNote?: string;
}

export const toolConfigs: Record<string, ToolConfig> = {
  // PDF CONVERSION TOOLS
  "pdf-to-word": {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    acceptedFormats: [".pdf"],
    maxFileSize: "50MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 50MB each",
    outputFormat: "DOCX",
    icon: FileText,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/pdf-to-word"
  },
  "pdf-to-excel": {
    id: "pdf-to-excel",
    title: "PDF to Excel", 
    description: "Extract data from PDF to Excel spreadsheets",
    acceptedFormats: [".pdf"],
    maxFileSize: "50MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 50MB each",
    outputFormat: "XLSX",
    icon: FileSpreadsheet,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/pdf-to-excel"
  },
  "pdf-to-powerpoint": {
    id: "pdf-to-powerpoint",
    title: "PDF to PowerPoint",
    description: "Turn your PDF files into editable PowerPoint PPT and PPTX files",
    acceptedFormats: [".pdf"],
    maxFileSize: "50MB", 
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 50MB each",
    outputFormat: "PPTX",
    icon: Presentation,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/pdf-to-powerpoint"
  },
  "pdf-to-images": {
    id: "pdf-to-images",
    title: "PDF to Images",
    description: "Convert PDF pages to image files",
    acceptedFormats: [".pdf"],
    maxFileSize: "50MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here", 
    fileTypeHint: "Supports: PDF files up to 50MB each",
    outputFormat: "JPG/PNG",
    icon: Image,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/pdf-to-images"
  },
  "word-to-pdf": {
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert Word documents to PDF format",
    acceptedFormats: [".doc", ".docx"],
    maxFileSize: "50MB",
    buttonText: "Select Word Documents",
    dropAreaText: "Drop your Word documents here",
    fileTypeHint: "Supports: DOC, DOCX files up to 50MB each",
    outputFormat: "PDF",
    icon: FileText,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/word-to-pdf"
  },
  "excel-to-pdf": {
    id: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Convert Excel files to PDF format",
    acceptedFormats: [".xls", ".xlsx"],
    maxFileSize: "50MB",
    buttonText: "Select Excel Files",
    dropAreaText: "Drop your Excel files here",
    fileTypeHint: "Supports: XLS, XLSX files up to 50MB each",
    outputFormat: "PDF",
    icon: FileSpreadsheet,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/excel-to-pdf"
  },
  "powerpoint-to-pdf": {
    id: "powerpoint-to-pdf",
    title: "PowerPoint to PDF",
    description: "Make PPT and PPTX slideshows easy to view by converting them to PDF",
    acceptedFormats: [".ppt", ".pptx"],
    maxFileSize: "100MB",
    buttonText: "Select PowerPoint Files",
    dropAreaText: "Drop your PowerPoint files here",
    fileTypeHint: "Supports: PPT, PPTX files up to 100MB each",
    outputFormat: "PDF",
    icon: Presentation,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/powerpoint-to-pdf"
  },
  "html-to-pdf": {
    id: "html-to-pdf",
    title: "HTML to PDF",
    description: "Convert webpages in HTML to PDF with a click",
    acceptedFormats: [".html", ".htm"],
    maxFileSize: "10MB",
    buttonText: "Select HTML Files",
    dropAreaText: "Drop your HTML files here",
    fileTypeHint: "Supports: HTML, HTM files up to 10MB each",
    outputFormat: "PDF",
    icon: Code,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/html-to-pdf"
  },

  // IMAGE PROCESSING TOOLS
  "images-to-pdf": {
    id: "images-to-pdf",
    title: "Images to PDF",
    description: "Create PDF from multiple image files",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
    maxFileSize: "20MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG, GIF, BMP, WebP up to 20MB each",
    outputFormat: "PDF",
    icon: Image,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Convert",
    route: "/upload/images-to-pdf"
  },
  "resize-images": {
    id: "resize-images",
    title: "Resize Images",
    description: "Change image dimensions, scale by percentage, or use preset sizes",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
    maxFileSize: "20MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG, GIF, BMP, WebP up to 20MB each",
    outputFormat: "Same Format",
    icon: Maximize2,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/resize-image"
  },
  "crop-images": {
    id: "crop-images", 
    title: "Crop Images",
    description: "Cut specific parts of images with freeform or preset ratios",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
    maxFileSize: "20MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG, GIF, BMP, WebP up to 20MB each",
    outputFormat: "Same Format",
    icon: Crop,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/crop-image"
  },
  "rotate-images": {
    id: "rotate-images",
    title: "Rotate Images", 
    description: "Rotate images by any angle with automatic background fill",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
    maxFileSize: "20MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG, GIF, BMP, WebP up to 20MB each",
    outputFormat: "Same Format",
    icon: RefreshCw,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/rotate-image"
  },
  "convert-image-format": {
    id: "convert-image-format",
    title: "Convert Image Format",
    description: "Convert images to JPG, PNG, WebP, GIF, AVIF or TIFF with quality settings",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"],
    maxFileSize: "25MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here", 
    fileTypeHint: "Supports: JPG, PNG, GIF, BMP, WebP, TIFF up to 25MB each",
    outputFormat: "Various Formats",
    icon: RefreshCw,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/convert-image-format"
  },
  "compress-images": {
    id: "compress-images",
    title: "Compress Images",
    description: "Reduce image file size without losing quality for web optimization",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    maxFileSize: "25MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG, WebP up to 25MB each",
    outputFormat: "Compressed Images",
    icon: Minimize2,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/compress-image"
  },
  "upscale-images": {
    id: "upscale-images",
    title: "Upscale Images",
    description: "Enhance image resolution using AI technology up to 4x",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    maxFileSize: "10MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG, WebP up to 10MB each",
    outputFormat: "High-res Images",
    icon: TrendingUp,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/upscale-image"
  },
  "remove-background": {
    id: "remove-background",
    title: "Remove Background",
    description: "Remove image backgrounds automatically using AI technology",
    acceptedFormats: [".jpg", ".jpeg", ".png"],
    maxFileSize: "15MB",
    buttonText: "Select Images",
    dropAreaText: "Drop your images here",
    fileTypeHint: "Supports: JPG, PNG up to 15MB each",
    outputFormat: "PNG with Transparency",
    icon: Scissors,
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Image Tools",
    route: "/upload/remove-background"
  },

  // PDF MANAGEMENT TOOLS
  "edit-pdf": {
    id: "edit-pdf",
    title: "Edit PDF",
    description: "Add text and images to your PDF right in the browser — no upload needed",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Edited PDF",
    icon: Pencil,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/edit-pdf"
  },
  "restore-document": {
    id: "restore-document",
    title: "Document Restore",
    description: "Restore a broken or damaged PDF/photo into a clean, sharpened PDF",
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"],
    maxFileSize: "25MB",
    buttonText: "Select Document",
    dropAreaText: "Drop your damaged PDF or photo here",
    fileTypeHint: "Supports: PDF, JPG, PNG, WEBP, BMP, TIFF up to 25MB",
    outputFormat: "Restored PDF",
    icon: RefreshCw,
    iconColor: "text-[#f7433d]",
    iconBgColor: "bg-[#f7433d]/10",
    iconBorderColor: "border-[#f7433d]/20",
    category: "Edit",
    route: "/upload/restore-document",
    comingSoon: true,
    comingSoonNote:
      "Document Restore is coming soon. We're putting the finishing touches on it — check back shortly."
  },
  "lock-pdf": {
    id: "lock-pdf",
    title: "Lock PDF",
    description: "Password-protect a PDF with strong AES-256 encryption",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF",
    dropAreaText: "Drop your PDF here to lock it",
    fileTypeHint: "Supports: PDF up to 100MB",
    outputFormat: "Password-protected PDF",
    icon: Lock,
    iconColor: "text-[#f7433d]",
    iconBgColor: "bg-[#f7433d]/10",
    iconBorderColor: "border-[#f7433d]/20",
    category: "Security",
    route: "/upload/lock-pdf"
  },
  "unlock-pdf": {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Remove password protection from a PDF you can open",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF",
    dropAreaText: "Drop your password-protected PDF here",
    fileTypeHint: "Supports: PDF up to 100MB",
    outputFormat: "Unlocked PDF",
    icon: Unlock,
    iconColor: "text-[#f7433d]",
    iconBgColor: "bg-[#f7433d]/10",
    iconBorderColor: "border-[#f7433d]/20",
    category: "Security",
    route: "/upload/unlock-pdf"
  },
  // VIDEO TOOLS
  "compress-video": {
    id: "compress-video",
    title: "Video Compressor",
    description: "Reduce video file size while keeping good quality",
    acceptedFormats: [".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv", ".wmv", ".m4v", ".mpeg", ".mpg", ".3gp", ".ts", ".m2ts", ".mts", ".ogv"],
    maxFileSize: "200MB",
    buttonText: "Select Video",
    dropAreaText: "Drop your video here",
    fileTypeHint: "Supports: MP4, MOV, MKV, AVI, WEBM and more up to 200MB",
    outputFormat: "Compressed MP4",
    icon: Video,
    iconColor: "text-[#f7433d]",
    iconBgColor: "bg-[#f7433d]/10",
    iconBorderColor: "border-[#f7433d]/20",
    category: "Video Tools",
    route: "/upload/compress-video"
  },
  "merge-pdfs": {
    id: "merge-pdfs",
    title: "PDF Merger",
    description: "Combine multiple PDF files into one",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 100MB each",
    outputFormat: "Merged PDF",
    icon: Copy,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Organize",
    route: "/upload/merge-pdfs"
  },
  "split-pdf": {
    id: "split-pdf",
    title: "PDF Splitter",
    description: "Split PDF into separate pages or sections",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 100MB each",
    outputFormat: "PDF Files",
    icon: Scissors,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Organize",
    route: "/upload/split-pdf"
  },
  "compress-pdf": {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality",
    acceptedFormats: [".pdf"],
    maxFileSize: "200MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 200MB each",
    outputFormat: "Compressed PDF",
    icon: Archive,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/compress-pdf"
  },
  "rotate-pdf": {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate your PDFs the way you need them",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF Files",
    dropAreaText: "Drop your PDF files here",
    fileTypeHint: "Supports: PDF files up to 100MB each",
    outputFormat: "Rotated PDF",
    icon: RotateCw,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Organize",
    route: "/upload/rotate-pdf"
  },
  "crop-pdf": {
    id: "crop-pdf",
    title: "Crop PDF",
    description: "Trim margins or select a region and crop every page — right in your browser",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Cropped PDF",
    icon: Crop,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/crop-pdf"
  },
  "sign-pdf": {
    id: "sign-pdf",
    title: "Sign PDF",
    description: "Draw, type or upload a signature and place it anywhere on your PDF",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Signed PDF",
    icon: PenTool,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/sign-pdf"
  },
  "watermark-pdf": {
    id: "watermark-pdf",
    title: "Add Watermark",
    description: "Stamp text or an image watermark across every page of your PDF",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Watermarked PDF",
    icon: Stamp,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/watermark-pdf"
  },
  "add-image-pdf": {
    id: "add-image-pdf",
    title: "Add Image to PDF",
    description: "Place a logo, photo or stamp on any page and resize it to fit",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Updated PDF",
    icon: ImagePlus,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/add-image-pdf"
  },
  "delete-pages-pdf": {
    id: "delete-pages-pdf",
    title: "Delete Pages",
    description: "Preview page thumbnails and remove the pages you don't need",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Updated PDF",
    icon: FileMinus,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Organize",
    route: "/upload/delete-pages-pdf"
  },
  "ocr-pdf": {
    id: "ocr-pdf",
    title: "OCR PDF",
    description: "Recognise text in scanned PDFs and export selectable text or a searchable PDF",
    acceptedFormats: [".pdf"],
    maxFileSize: "100MB",
    buttonText: "Select PDF File",
    dropAreaText: "Drop your PDF file here",
    fileTypeHint: "Supports: PDF files up to 100MB",
    outputFormat: "Searchable PDF / Text",
    icon: ScanText,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50",
    iconBorderColor: "border-blue-200",
    category: "Edit",
    route: "/upload/ocr-pdf"
  }
};

// PDF-converter tools that are handled IN PLACE on the homepage hero
// (clicking them swaps the hero text + upload card instead of navigating).
export const PDF_CONVERTER_IDS = [
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "pdf-to-images",
  "word-to-pdf",
  "excel-to-pdf",
  "powerpoint-to-pdf",
  "images-to-pdf",
  "html-to-pdf",
];

export const isHeroTool = (id?: string | null): boolean =>
  !!id && PDF_CONVERTER_IDS.includes(id);

// Dynamic action-button label per tool (matches the labels used on the Tools page).
export const getToolActionLabel = (cfg: ToolConfig): string => {
  const labels: Record<string, string> = {
    "pdf-to-word": "Convert to Word",
    "pdf-to-excel": "Convert to Excel",
    "pdf-to-powerpoint": "Convert to PowerPoint",
    "pdf-to-images": "Convert to Images",
    "word-to-pdf": "Convert to PDF",
    "excel-to-pdf": "Convert to PDF",
    "powerpoint-to-pdf": "Convert to PDF",
    "html-to-pdf": "Convert to PDF",
    "images-to-pdf": "Convert to PDF",
  };
  return labels[cfg.id] ?? cfg.title;
};

// Server-side toolType identifier (snake_case) for the /api/convert endpoint.
export const getServerToolType = (cfg: ToolConfig): string => {
  const map: Record<string, string> = {
    "pdf-to-word": "pdf_to_word",
    "pdf-to-excel": "pdf_to_excel",
    "pdf-to-powerpoint": "pdf_to_powerpoint",
    "pdf-to-images": "pdf_to_images",
    "word-to-pdf": "word_to_pdf",
    "excel-to-pdf": "excel_to_pdf",
    "powerpoint-to-pdf": "powerpoint_to_pdf",
    "html-to-pdf": "html_to_pdf",
    "images-to-pdf": "images_to_pdf",
  };
  return map[cfg.id] ?? cfg.id.replace(/-/g, "_");
};

// Resolve the full ToolConfig from a server toolType (snake_case), e.g. "pdf_to_word".
export const getToolConfigByServerType = (toolType?: string | null): ToolConfig | null => {
  if (!toolType) return null;
  for (const key of Object.keys(toolConfigs)) {
    if (getServerToolType(toolConfigs[key]) === toolType) {
      return toolConfigs[key];
    }
  }
  return null;
};

// Output-format label for a server toolType (snake_case), e.g. "pdf_to_word" -> "DOCX".
export const getOutputFormatByServerType = (toolType?: string | null): string | null => {
  return getToolConfigByServerType(toolType)?.outputFormat ?? null;
};

// Helper function to get tool config by title
export const getToolConfigByTitle = (title: string): ToolConfig | null => {
  const toolKey = Object.keys(toolConfigs).find(key => 
    toolConfigs[key].title === title
  );
  return toolKey ? toolConfigs[toolKey] : null;
};

// Helper function to validate file type
export const validateFileType = (file: File, acceptedFormats: string[]): boolean => {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  return acceptedFormats.includes(fileExtension);
};

// Helper function to get file type error message
export const getFileTypeErrorMessage = (acceptedFormats: string[]): string => {
  const formatList = acceptedFormats.map(f => f.toUpperCase().replace('.', '')).join(', ');
  return `Please select ${formatList} files only. The selected file type is not supported.`;
};