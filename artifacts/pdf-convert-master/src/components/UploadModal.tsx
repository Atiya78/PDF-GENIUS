import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Shield, Zap, Download, X } from "lucide-react";
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

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolConfig: ToolConfig;
  onFileUpload?: (files: File[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen,
  onClose,
  toolConfig, 
  onFileUpload 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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

    if (validFiles.length !== files.length) {
      alert(`Some files were rejected. Only ${toolConfig.acceptedFormats.join(', ')} files are accepted.`);
    }

    setUploadedFiles(validFiles);
    onFileUpload?.(validFiles);
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleStartConversion = async () => {
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      alert(`Conversion completed! ${uploadedFiles.length} file(s) processed.`);
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setUploadedFiles([]);
    setIsProcessing(false);
    setIsDragOver(false);
    onClose();
  };

  const getFileTypeText = () => {
    const formats = toolConfig.acceptedFormats.join(', ').toUpperCase();
    return formats.replace(/\./g, '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={`w-12 h-12 rounded-2xl border-2 ${toolConfig.iconBg} flex items-center justify-center`}>
              {toolConfig.icon}
            </div>
            {toolConfig.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <p className="text-[#57534e]">
            {toolConfig.description}
          </p>

          {/* Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
              ${isDragOver 
                ? 'border-[#f7433d] bg-[#fdece9]' 
                : 'border-[#e7e0d5] hover:border-gray-400 bg-[#faf7f2]'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectFiles}
          >
            {/* Upload Icon */}
            <div className="flex justify-center mb-4">
              <ConverterStatusIcon status="upload" size={80} toolId={toolConfig.id} />
            </div>

            {/* Upload Text */}
            <h3 className="text-lg font-semibold text-[#1c1917] mb-2">
              Drop your {getFileTypeText()} file here
            </h3>
            <p className="text-[#57534e] mb-4">
              or click to browse files
            </p>

            {/* Select Files Button */}
            <Button
              className="bg-[#f7433d] hover:bg-[#c8302a] text-white"
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
            <p className="text-xs text-[#57534e] mt-3">
              Supported: {getFileTypeText()} • Max: {toolConfig.maxFileSize}MB
            </p>
          </div>

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">
                Files Ready for Conversion:
              </h4>
              <ul className="space-y-1 mb-4">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="text-green-700 text-sm flex items-center justify-between">
                    <span>{file.name}</span>
                    <span className="text-xs text-green-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-[#f7433d] hover:bg-[#c8302a] text-white"
                onClick={handleStartConversion}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <ConverterStatusIcon status="processing" size={16} className="brightness-0 invert" />
                    Processing...
                  </div>
                ) : (
                  'Start Conversion'
                )}
              </Button>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-[#fdece9] flex items-center justify-center mx-auto mb-2">
                <Shield className="w-4 h-4 text-[#c8302a]" />
              </div>
              <h4 className="text-sm font-medium text-[#1c1917] mb-1">Secure</h4>
              <p className="text-xs text-[#57534e]">Browser processing</p>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-[#fdece9] flex items-center justify-center mx-auto mb-2">
                <Zap className="w-4 h-4 text-[#c8302a]" />
              </div>
              <h4 className="text-sm font-medium text-[#1c1917] mb-1">Fast</h4>
              <p className="text-xs text-[#57534e]">Lightning speed</p>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-[#fdece9] flex items-center justify-center mx-auto mb-2">
                <Download className="w-4 h-4 text-[#c8302a]" />
              </div>
              <h4 className="text-sm font-medium text-[#1c1917] mb-1">Easy</h4>
              <p className="text-xs text-[#57534e]">Instant download</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
