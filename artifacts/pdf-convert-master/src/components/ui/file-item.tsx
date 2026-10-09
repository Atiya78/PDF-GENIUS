import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Presentation,
  X, 
  CheckCircle, 
  AlertCircle, 
  Download,
  GripVertical
} from "lucide-react";

interface FileItemProps {
  file: File;
  index: number;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'converting' | 'completed' | 'failed';
  progress?: number;
  errorMessage?: string;
  downloadUrl?: string;
  onRemove: (index: number) => void;
  onDownload?: (index: number) => void;
  isDragging?: boolean;
  validationMessage?: string;
  /** Tool-specific progress verb, e.g. "Locking". Defaults to "Converting". */
  progressLabel?: string;
  /** Tool-specific completion verb, e.g. "Locked". Defaults to "Completed". */
  doneLabel?: string;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  index,
  status,
  progress = 0,
  errorMessage,
  downloadUrl,
  onRemove,
  onDownload,
  isDragging = false,
  validationMessage,
  progressLabel = "Converting",
  doneLabel = "Completed"
}) => {
  const statusLabel =
    status === "converting"
      ? progressLabel
      : status === "completed"
      ? doneLabel
      : status;
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-5 h-5 text-blue-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'validating':
        return <ProcessingSpinner size={16} />;
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'converting':
        return <ProcessingSpinner size={16} />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'valid':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'invalid':
      case 'failed':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'converting':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800';
      case 'completed':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700';
    }
  };

  return (
    <div 
      className={`
        group relative rounded-lg border-2 p-4 transition-all duration-200
        ${getStatusColor()}
        ${isDragging ? 'opacity-50 transform rotate-2' : ''}
        hover:shadow-md
      `}
    >
      {/* Drag Handle */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      <div className="flex items-start space-x-3 ml-6">
        {/* File Icon */}
        <div className="flex-shrink-0 mt-1">
          {getFileIcon()}
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.name}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon()}
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {statusLabel}
                  </span>
                </div>
              </div>
              
              {/* Validation/Error Message */}
              {(validationMessage || errorMessage) && (
                <p className={`text-xs mt-1 ${
                  status === 'invalid' || status === 'failed' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {errorMessage || validationMessage}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              {status === 'completed' && downloadUrl && onDownload && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(index)}
                  className="h-8 px-2"
                >
                  <Download className="w-3 h-3" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                disabled={status === 'converting'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {status === 'converting' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{progressLabel}...</span>
                <span>In progress</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};