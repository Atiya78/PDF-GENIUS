import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Upload, Shield, Zap, Download, FileText, FileSpreadsheet, Presentation, FilePlus, Scissors, Archive, Lock, PenTool, ScanText, Edit, FileSignature } from "lucide-react";
import { ConverterStatusIcon } from "@/components/converter-status-icon";

interface ToolConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  acceptedFormats: string[];
  maxFileSize: number; // in MB
}

interface UploadPageProps {
  toolConfig: ToolConfig;
  onFileUpload?: (files: File[]) => void;
}

const toolConfigs: Record<string, ToolConfig> = {
  "word-to-pdf": {
    id: "word-to-pdf",
    name: "Word to PDF",
    title: "Word to PDF",
    description: "Convert Word documents to PDF format",
    icon: <FileText className="w-9 h-9 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    acceptedFormats: [".doc", ".docx"],
    maxFileSize: 50
  },
  "pdf-to-word": {
    id: "pdf-to-word",
    name: "PDF to Word",
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    icon: <FileText className="w-9 h-9 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    acceptedFormats: [".pdf"],
    maxFileSize: 50
  },
  "pdf-to-excel": {
    id: "pdf-to-excel",
    name: "PDF to Excel",
    title: "PDF to Excel",
    description: "Extract tables and data to Excel spreadsheets",
    icon: <FileSpreadsheet className="w-9 h-9 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    acceptedFormats: [".pdf"],
    maxFileSize: 50
  },
  "pdf-to-powerpoint": {
    id: "pdf-to-powerpoint",
    name: "PDF to PowerPoint",
    title: "PDF to PowerPoint",
    description: "Convert PDF presentations to PPT format",
    icon: <Presentation className="w-9 h-9 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    acceptedFormats: [".pdf"],
    maxFileSize: 50
  },
  "merge-pdfs": {
    id: "merge-pdfs",
    name: "Merge PDFs",
    title: "Merge PDFs",
    description: "Combine multiple PDF files into one document",
    icon: <FilePlus className="w-9 h-9 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    acceptedFormats: [".pdf"],
    maxFileSize: 100
  },
  "split-pdf": {
    id: "split-pdf",
    name: "Split PDF",
    title: "Split PDF",
    description: "Split large PDF files into smaller documents",
    icon: <Scissors className="w-9 h-9 text-gray-600" />,
    iconBg: "bg-gray-50 border-gray-200",
    acceptedFormats: [".pdf"],
    maxFileSize: 100
  },
  "compress-pdf": {
    id: "compress-pdf",
    name: "Compress PDF",
    title: "Compress PDF",
    description: "Reduce PDF file size while maintaining quality",
    icon: <Archive className="w-9 h-9 text-blue-500" />,
    iconBg: "bg-blue-50 border-blue-200",
    acceptedFormats: [".pdf"],
    maxFileSize: 200
  }
};

export const UploadPage: React.FC<UploadPageProps> = ({ 
  toolConfig, 
  onFileUpload 
}) => {
  const [location, setLocation] = useLocation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [toolConfig]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, [toolConfig]);

  const handleFiles = (files: File[]) => {
    // Filter files based on accepted formats
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return toolConfig.acceptedFormats.includes(extension);
    });

    setUploadedFiles(validFiles);
    onFileUpload?.(validFiles);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const getFileTypeText = () => {
    const formats = toolConfig.acceptedFormats.join(', ').toUpperCase();
    return formats.replace(/\./g, '');
  };

  return (
    <div className="min-h-screen bg-white py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          {/* Tool Icon */}
          <div className="flex justify-center mb-8">
            <div className={`w-24 h-24 rounded-3xl border-2 ${toolConfig.iconBg} flex items-center justify-center shadow-lg`}>
              {toolConfig.icon}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {toolConfig.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {toolConfig.description}
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-3xl mx-auto mb-16">
          <div
            className={`
              relative border-2 border-dashed rounded-3xl bg-white shadow-xl p-16 text-center transition-all duration-200
              ${isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectFiles}
          >
            {/* Upload Icon */}
            <div className="flex justify-center mb-8">
              <ConverterStatusIcon status="upload" size={96} toolId={toolConfig.id} />
            </div>

            {/* Upload Text */}
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Drop your {getFileTypeText()} file here
            </h3>
            <p className="text-lg text-gray-600 mb-8">
              or click to browse files
            </p>

            {/* Select Files Button */}
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-semibold shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectFiles();
              }}
            >
              Select Files
            </Button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple={toolConfig.id === "merge-pdfs"}
              accept={toolConfig.acceptedFormats.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File Info */}
            <p className="text-sm text-gray-500 mt-4">
              Supported formats: {getFileTypeText()} • Max file size: {toolConfig.maxFileSize}MB
            </p>
          </div>

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Files Ready for Conversion:</h4>
              <ul className="space-y-1">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="text-green-700 text-sm">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
              <Button 
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // Handle conversion start
                  console.log('Starting conversion for:', uploadedFiles);
                }}
              >
                Start Conversion
              </Button>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {/* Secure Processing */}
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Secure Processing
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your files are processed securely in your browser
            </p>
          </div>

          {/* Fast Conversion */}
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Fast Conversion
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Lightning-fast processing with high-quality results
            </p>
          </div>

          {/* Easy Download */}
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Easy Download
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Download your converted files instantly after processing
            </p>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-12">
          <Button
            variant="outline"
            onClick={() => setLocation('/dashboard/live-tools')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Tools
          </Button>
        </div>
      </div>
    </div>
  );
};

// Hook to get tool configuration by ID
export const useToolConfig = (toolId: string): ToolConfig | null => {
  return toolConfigs[toolId] || null;
};

// Export tool configurations for external use
export { toolConfigs };

// Default export with a specific tool (for standalone usage)
export const WordToPdfUpload: React.FC = () => {
  return <UploadPage toolConfig={toolConfigs["word-to-pdf"]} />;
};

export const PdfToWordUpload: React.FC = () => {
  return <UploadPage toolConfig={toolConfigs["pdf-to-word"]} />;
};

export const PdfToExcelUpload: React.FC = () => {
  return <UploadPage toolConfig={toolConfigs["pdf-to-excel"]} />;
};

export const MergePdfsUpload: React.FC = () => {
  return <UploadPage toolConfig={toolConfigs["merge-pdfs"]} />;
};
