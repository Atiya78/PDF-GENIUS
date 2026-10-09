import React, { useState, useRef, useCallback } from "react";
import { authedFetch, getAuthError, AuthError } from "@/lib/authedFetch";
import { downloadFromUrl } from "@/lib/download";
import { addGuestDownload, isGuest } from "@/lib/guestDownloads";
import { GuestRecentDownloads } from "@/components/GuestRecentDownloads";
import { Button } from "@/components/ui/button";
import { AuthErrorAction } from "@/components/AuthErrorAction";
import { LoginRequiredDialog } from "@/components/LoginRequiredDialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePlanMaxFileMB, effectiveMaxMB } from "@/lib/usePlanUploadLimit";
import { 
  CheckCircle, 
  AlertCircle, 
  FileCheck,
  Settings,
  Trash2,
  RefreshCw,
  Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EnhancedUploadArea } from "@/components/ui/enhanced-upload-area";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { ToolPageShell } from "@/components/upload/ToolPageShell";
import { FileItem } from "@/components/ui/file-item";
import { toolConfigs, getToolActionLabel } from "@/lib/toolConfig";
import { getToolActionLabels } from "@/lib/toolActionLabels";
import { useToolPaused } from "@/lib/usePausedTools";
import { PausedToolNotice } from "@/components/PausedToolNotice";

interface ConversionWorkflowProps {
  toolType: string;
  toolTitle: string;
  toolDescription: string;
  acceptedFormats: string[];
  maxFileSize: string;
  outputFormat: string;
  toolIcon: React.ReactNode;
  iconBg: string;
  /** Extra JSON merged into the `options` field posted to /api/convert. */
  extraOptions?: Record<string, unknown>;
  /** Rendered in the files-selected stage above the action buttons. */
  renderSettings?: (ctx: { files: File[]; disabled: boolean }) => React.ReactNode;
  /** When false the Convert button is disabled (e.g. invalid settings). Default true. */
  canConvert?: boolean;
  /** Max files per run. Default 10. */
  maxFiles?: number;
  /** Replaces `outputFormat.toUpperCase()` in the Convert button copy. */
  outputLabel?: string;
  /** Filename used for the saved download (honest extension). Defaults to the input name. */
  downloadName?: (file: File) => string;
  /** Rendered above the dropzone in the upload stage. */
  uploadHeader?: React.ReactNode;
  /** Hide the dropzone in the upload stage (the header supplies the input). */
  hideDropzone?: boolean;
  /** Programmatically add files; processed whenever `key` changes. */
  injectedFiles?: { key: string; files: File[] } | null;
  /** Use the filename the server produced (real extension) for downloads. */
  useServerName?: boolean;
  /** Show actual input/output sizes and percentage change on completion. */
  showSizeComparison?: boolean;
}

interface FileUpload {
  id: string;
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'converting' | 'completed' | 'failed';
  progress: number;
  jobId?: number;
  errorMessage?: string;
  validationMessage?: string;
  downloadUrl?: string;
  outputName?: string;
  outputSize?: number;
}

type ConversionStage = 'upload' | 'files-selected' | 'converting' | 'completed' | 'error';

// MP4 Compressor levels. `ratio` is the target output size as a fraction of the
// original — kept in lockstep with the server's VIDEO_LEVEL_RATIOS so the shown
// estimate matches the produced file.
const VIDEO_LEVELS = [
  { id: 'high', label: 'High', sub: 'Smallest size, standard quality', ratio: 0.11 },
  { id: 'medium', label: 'Medium', sub: 'Medium size, better quality', ratio: 0.226 },
  { id: 'low', label: 'Low', sub: 'Larger size, highest quality', ratio: 0.342 },
] as const;

const formatMB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export const ConversionWorkflow: React.FC<ConversionWorkflowProps> = ({
  toolType,
  toolTitle,
  toolDescription,
  acceptedFormats,
  maxFileSize,
  outputFormat,
  toolIcon,
  iconBg,
  extraOptions,
  renderSettings,
  canConvert = true,
  maxFiles: maxFilesProp = 10,
  outputLabel,
  downloadName,
  uploadHeader,
  hideDropzone = false,
  injectedFiles,
  useServerName = false,
  showSizeComparison = false,
}) => {
  const [stage, setStage] = useState<ConversionStage>('upload');
  const [selectedFiles, setSelectedFiles] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Lock PDF / Unlock PDF are the only tools that take a password. Show a
  // password field for them and ship it through as options.password.
  const needsPassword = toolType === 'lock-pdf' || toolType === 'unlock-pdf';
  const passwordReady = !needsPassword || password.trim().length > 0;

  // MP4 Compressor: user picks a compression level in a popup after upload.
  // Each level targets a fraction of the original size (shared with the server
  // encode target so the produced file lands near the shown estimate).
  const isVideoCompress = toolType === 'compress-video';
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<'high' | 'medium' | 'low'>('high');

  const maxFiles = maxFilesProp;
  const planMaxMB = usePlanMaxFileMB();
  const effectiveMaxMb = effectiveMaxMB(parseFloat(maxFileSize), planMaxMB);
  const maxSizeInBytes = effectiveMaxMb * 1024 * 1024;
  const effectiveMaxLabel = `${effectiveMaxMb}MB`;

  // Tool-specific upload copy so the upload page clearly states the conversion
  // (e.g. "Convert to Word") and matches every other tool's upload design.
  // Falls back to the tool's own title prop when a toolType has no config entry,
  // so the action button always names the tool (never a generic "Select Files").
  // Same dash→underscore mapping this workflow uses when submitting jobs, so
  // the paused check matches exactly what the server would reject.
  const isPaused = useToolPaused(toolType.replace(/-/g, '_'));
  const cfg = toolConfigs[toolType];
  const uploadTitle = cfg?.dropAreaText;
  const uploadActionLabel = cfg ? getToolActionLabel(cfg) : toolTitle;

  // Tool-specific action wording (e.g. "Locking" / "Unlocking") so the progress
  // and completion copy names the actual action instead of a generic "Convert".
  const actionLabels = getToolActionLabels(toolType);

  const generateFileId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

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
    if (files.length > 0) {
      handleFilesSelection(files);
    }
  }, [selectedFiles]);

  const handleFilesSelection = useCallback((newFiles: File[]) => {
    const remainingSlots = maxFiles - selectedFiles.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length === 0) {
      toast({
        title: "Maximum files reached",
        description: `You can only select up to ${maxFiles} files at once`,
        variant: "destructive"
      });
      return;
    }

    const validatedFiles: FileUpload[] = filesToAdd.map(file => {
      const fileUpload: FileUpload = {
        id: generateFileId(),
        file,
        status: 'validating',
        progress: 0
      };

      // Validate file format
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFormats.includes(extension)) {
        fileUpload.status = 'invalid';
        fileUpload.errorMessage = `Invalid file format. Expected: ${acceptedFormats.join(', ')}`;
        return fileUpload;
      }

      // Validate file size
      if (file.size > maxSizeInBytes) {
        fileUpload.status = 'invalid';
        fileUpload.errorMessage = `File size exceeds ${effectiveMaxLabel}${effectiveMaxMb < parseFloat(maxFileSize) ? ' for your plan' : ''}`;
        return fileUpload;
      }

      // File is valid
      fileUpload.status = 'valid';
      fileUpload.validationMessage = `Ready to ${actionLabels.base}`;
      return fileUpload;
    });

    setSelectedFiles(prev => [...prev, ...validatedFiles]);
    setStage('files-selected');
    setErrorMessage(null);

    // MP4 Compressor: surface the level-picker popup as soon as a valid video
    // is added, so the user picks a target size before compressing.
    if (isVideoCompress && validatedFiles.some(f => f.status === 'valid')) {
      setLevelModalOpen(true);
    }
    
    const validCount = validatedFiles.filter(f => f.status === 'valid').length;
    const invalidCount = validatedFiles.filter(f => f.status === 'invalid').length;
    
    toast({
      title: `${validCount} file${validCount !== 1 ? 's' : ''} added`,
      description: invalidCount > 0 
        ? `${invalidCount} file${invalidCount !== 1 ? 's' : ''} had validation errors`
        : `Files are ready to ${actionLabels.base}`,
      variant: invalidCount > 0 ? "destructive" : "default"
    });
  }, [selectedFiles, maxFiles, acceptedFormats, maxSizeInBytes, maxFileSize, effectiveMaxLabel, toast]);

  const removeFile = useCallback((index: number) => {
    const fileToRemove = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    if (selectedFiles.length === 1) {
      setStage('upload');
    }
    
    toast({
      title: "File removed",
      description: `${fileToRemove.file.name} has been removed`,
    });
  }, [selectedFiles]);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    setStage('upload');
    setBatchProgress(0);
    setIsConverting(false);
    setErrorMessage(null);
    setAuthError(null);
    
    toast({
      title: "All files cleared",
      description: "File selection has been reset",
    });
  }, []);

  const startBatchConversion = async () => {
    const validFiles = selectedFiles.filter(f => f.status === 'valid');
    if (validFiles.length === 0) return;

    setStage('converting');
    setIsConverting(true);
    setBatchProgress(0);
    setErrorMessage(null);
    setAuthError(null);

    // Mark all valid files as converting
    setSelectedFiles(prev => prev.map(file => 
      file.status === 'valid' 
        ? { ...file, status: 'converting', progress: 0 }
        : file
    ));

    try {
      // Process all files and wait for completion
      await Promise.all(validFiles.map((fileUpload, index) => 
        processIndividualFile(fileUpload, index, validFiles.length)
      ));

      // Note: completion state will be set by checkBatchCompletion
      // after all individual files are actually completed
      
    } catch (error) {
      if (error instanceof AuthError) {
        setAuthError(error);
        setErrorMessage(error.message);
        setStage('error');
        setIsConverting(false);

        toast({
          title: "Sign in required",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Batch conversion failed');
      setStage('error');
      setIsConverting(false);
      
      toast({
        title: "Conversion Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const processIndividualFile = async (fileUpload: FileUpload, index: number, total: number) => {
    return new Promise<void>((resolve, reject) => {
      const processFile = async () => {
        try {
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('file', fileUpload.file);
          formData.append('toolType', toolType.replace(/-/g, '_'));
          formData.append('fileName', fileUpload.file.name);
          formData.append('fileSize', fileUpload.file.size.toString());
          const convertOptions: Record<string, unknown> = {};
          if (needsPassword) convertOptions.password = password.trim();
          if (isVideoCompress) convertOptions.level = compressionLevel;
          if (extraOptions) Object.assign(convertOptions, extraOptions);
          formData.append('options', JSON.stringify(convertOptions));

          // Start conversion job with file upload
          const response = await authedFetch('/api/convert', {
            method: 'POST',
            body: formData,
          });

          const responseData = await response.json();

          if (!responseData.success) {
            throw new Error(responseData.error || 'Conversion failed');
          }

          const jobData = responseData.data;
          
          // Start polling and wait for completion
          await pollJobStatus(fileUpload.id, jobData.jobId, resolve, reject);
          
        } catch (error) {
          // Mark file as failed
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { 
                  ...f, 
                  status: 'failed' as const, 
                  errorMessage: error instanceof Error ? error.message : 'Conversion failed'
                }
              : f
          ));
          reject(error);
        }
      };
      processFile();
    });
  };

  const pollJobStatus = async (fileId: string, jobId: number, resolve?: () => void, reject?: (error: any) => void) => {
    let attempts = 0;
    // Video compression (two-pass encode) legitimately takes longer than the
    // other tools, so give it a much wider window before giving up.
    const isVideo = toolType === 'compress-video';
    const maxAttempts = isVideo ? 400 : 60; // ~600s for video, 90s otherwise
    
    const poll = async (): Promise<void> => {
      try {
        // Send the JWT so a logged-in user can poll their own job: the server
        // now 403s an owned job when polled without the owner's token.
        const response = await authedFetch(`/api/jobs/${jobId}`);
        const responseData = await response.json();
        
        if (!responseData.success) {
          throw new Error('Failed to get job status');
        }

        const job = responseData.data;
        
        if (job.status === 'completed') {
          // Guests have no dashboard history; persist so they can re-download
          // after a page refresh (the file lives in durable server storage).
          if (isGuest()) {
            addGuestDownload({
              toolType: toolType.replace(/-/g, '_'),
              jobId,
              fileName: job.outputFilename || job.inputFilename || `download-${jobId}`,
              ts: Date.now(),
            });
          }
          // File completed successfully
          setSelectedFiles(prev => {
            const updated = prev.map(f => 
              f.id === fileId 
                ? { 
                    ...f, 
                    status: 'completed' as const, 
                    progress: 100,
                    downloadUrl: `/api/download/${jobId}`,
                    outputName: job.outputFilename || undefined,
                    outputSize: typeof job.outputFileSize === 'number' ? job.outputFileSize : Number(job.outputFileSize) || undefined,
                  }
                : f
            );
            
            // Check if this was the last file to complete
            setTimeout(() => checkBatchCompletion(updated), 100);
            return updated;
          });
          
          resolve?.();
          return;
        } else if (job.status === 'failed') {
          // File failed
          setSelectedFiles(prev => {
            const updated = prev.map(f => 
              f.id === fileId 
                ? { 
                    ...f, 
                    status: 'failed' as const, 
                    errorMessage: job.errorMessage || 'Conversion failed'
                  }
                : f
            );
            
            // Check batch completion even with failures
            setTimeout(() => checkBatchCompletion(updated), 100);
            return updated;
          });
          
          reject?.(new Error(job.errorMessage || 'Conversion failed'));
          return;
        } else if (job.status === 'processing') {
          // Asymptotic progress: rises quickly at first, then keeps inching
          // toward (but never reaching) 99% until the job actually completes.
          // This avoids a hard plateau that makes a long encode look frozen.
          const base = 10;
          const ceiling = 99;
          const progress = Math.min(
            ceiling - 1,
            Math.round(ceiling - (ceiling - base) * Math.exp(-attempts / 40)),
          );

          setSelectedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress: Math.max(f.progress ?? base, progress) } : f
          ));
        }

        // Continue polling if not finished
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1500);
        } else {
          // Timeout - mark as failed
          console.error(`Job ${jobId} timed out after ${maxAttempts} attempts`);
          const timeoutError = new Error('Processing took longer than expected');
          setSelectedFiles(prev => {
            const updated = prev.map(f => 
              f.id === fileId 
                ? { 
                    ...f, 
                    status: 'failed' as const, 
                    errorMessage: timeoutError.message 
                  }
                : f
            );
            
            setTimeout(() => checkBatchCompletion(updated), 100);
            return updated;
          });
          
          reject?.(timeoutError);
        }
      } catch (error) {
        console.error(`Polling error for job ${jobId} (attempt ${attempts}):`, error);
        
        // Only mark as failed if we've exhausted all attempts or it's a final timeout
        if (attempts >= maxAttempts - 1) {
          const apiError = new Error(`Unable to check status after ${maxAttempts} attempts`);
          setSelectedFiles(prev => {
            const updated = prev.map(f => 
              f.id === fileId 
                ? { 
                    ...f, 
                    status: 'failed' as const, 
                    errorMessage: apiError.message 
                  }
                : f
            );
            
            setTimeout(() => checkBatchCompletion(updated), 100);
            return updated;
          });
          
          reject?.(apiError);
        } else {
          // Continue polling on temporary errors
          console.log(`Retrying status check for job ${jobId}, attempt ${attempts + 1}/${maxAttempts}`);
          attempts++;
          setTimeout(poll, 2000); // Longer delay on error
        }
      }
    };

    // Start polling after 500ms
    setTimeout(poll, 500);
  };

  const downloadIndividualFile = async (index: number) => {
    const file = selectedFiles[index];
    if (!file?.downloadUrl) return;
    try {
      await downloadFromUrl(file.downloadUrl, (useServerName ? file.outputName : undefined) || (downloadName ? downloadName(file.file) : file.file.name));
      toast({
        title: "Download Started",
        description: `${file.file.name} is being downloaded`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not download the file.";
      if (/log in/i.test(message)) {
        setLoginDialogOpen(true);
        return;
      }
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const downloadAllFiles = () => {
    const completedFiles = selectedFiles.filter(f => f.status === 'completed' && f.downloadUrl);
    
    void (async () => {
      let succeeded = 0;
      let failed = 0;
      let loginRequired = false;
      for (const file of completedFiles) {
        if (!file.downloadUrl) continue;
        try {
          await downloadFromUrl(file.downloadUrl, (useServerName ? file.outputName : undefined) || (downloadName ? downloadName(file.file) : file.file.name));
          succeeded += 1;
        } catch (err) {
          failed += 1;
          if (err instanceof Error && /log in/i.test(err.message)) loginRequired = true;
        }
        // Small gap so the browser doesn't throttle/block rapid downloads.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // A login-required failure is the actionable case: show the clear,
      // animated sign-in dialog instead of a generic "downloads failed" toast.
      if (loginRequired && succeeded === 0) {
        setLoginDialogOpen(true);
        return;
      }

      if (failed === 0) {
        toast({
          title: "Downloads Started",
          description: `${succeeded} file${succeeded !== 1 ? 's' : ''} downloaded`,
        });
      } else {
        toast({
          title: succeeded > 0 ? "Some downloads failed" : "Download failed",
          description: `${succeeded} succeeded, ${failed} failed`,
          variant: "destructive",
        });
      }
    })();
  };

  const checkBatchCompletion = (files: FileUpload[]) => {
    const convertingFiles = files.filter(f => f.status === 'converting');
    const completedFiles = files.filter(f => f.status === 'completed');
    const failedFiles = files.filter(f => f.status === 'failed');
    const totalProcessingFiles = convertingFiles.length + completedFiles.length + failedFiles.length;
    
    // Update batch progress
    if (totalProcessingFiles > 0) {
      const progress = Math.round(((completedFiles.length + failedFiles.length) / totalProcessingFiles) * 100);
      setBatchProgress(progress);
    }
    
    // Check if all files are done processing (completed or failed)
    if (convertingFiles.length === 0 && totalProcessingFiles > 0) {
      // All files are done
      setStage('completed');
      setBatchProgress(100);
      setIsConverting(false);
      
      // Show completion toast with actual counts. When nothing succeeded, show a
      // failure toast instead of implying downloads are available.
      if (completedFiles.length > 0) {
        toast({
          title: "Conversions Complete!",
          description: `${completedFiles.length} file${completedFiles.length !== 1 ? 's' : ''} converted successfully. Download buttons are now available.`,
        });
        if (failedFiles.length > 0) {
          setTimeout(() => {
            toast({
              title: "Some files failed",
              description: `${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''} could not be converted`,
              variant: "destructive",
            });
          }, 1000);
        }
      } else {
        toast({
          title: "Conversion failed",
          description: `${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''} could not be converted. Please check the details and try again.`,
          variant: "destructive",
        });
      }
    }
  };

  const resetWorkflow = () => {
    setStage('upload');
    setSelectedFiles([]);
    setBatchProgress(0);
    setIsConverting(false);
    setErrorMessage(null);
    setAuthError(null);
    setIsDragOver(false);
  };

  const injectedKeyRef = useRef<string | null>(null);
  const selectionRef = useRef(handleFilesSelection);
  selectionRef.current = handleFilesSelection;
  React.useEffect(() => {
    if (injectedFiles && injectedFiles.key !== injectedKeyRef.current) {
      injectedKeyRef.current = injectedFiles.key;
      selectionRef.current(injectedFiles.files);
    }
  }, [injectedFiles]);

  const validFilesCount = selectedFiles.filter(f => f.status === 'valid').length;
  const completedFilesCount = selectedFiles.filter(f => f.status === 'completed').length;
  const failedFilesCount = selectedFiles.filter(f => f.status === 'failed').length;
  const hasValidFiles = validFilesCount > 0;
  const hasCompletedFiles = completedFilesCount > 0;
  // On the "done" screen, only celebrate when at least one file actually
  // succeeded. If every file failed (e.g. a corrupt video), show a failure
  // state instead of a misleading green "successfully ..." header.
  const allFilesFailed = completedFilesCount === 0 && failedFilesCount > 0;

  return (
    <ToolPageShell
      title={toolTitle}
      description={toolDescription}
      icon={toolIcon}
      iconBoxClassName={iconBg}
      maxWidth="max-w-4xl"
      showHeader={stage !== "upload"}
    >
      {/* Paused by an admin: replace the dropzone with a friendly notice so
          visitors don't upload a file only to have the server reject it. */}
      {stage === 'upload' && isPaused && <PausedToolNotice toolTitle={toolTitle} />}

      {/* Upload Stage — bare dropzone, identical design to every other tool */}
      {stage === 'upload' && !isPaused && (
        <>
          {uploadHeader}
          {!hideDropzone && <EnhancedUploadArea
            acceptedFormats={acceptedFormats}
            maxFileSize={effectiveMaxLabel}
            maxFiles={maxFiles}
            onFilesSelected={handleFilesSelection}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            currentFileCount={selectedFiles.length}
            showAdvancedFeatures={true}
            toolId={toolType}
            title={uploadTitle}
            actionLabel={uploadActionLabel}
          />}
          <GuestRecentDownloads toolType={toolType.replace(/-/g, '_')} />
        </>
      )}

      {/* Workflow Card — only after files are selected / converting / done */}
      {stage !== 'upload' && (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${stage === 'files-selected' ? 'text-blue-600' : stage === 'converting' ? 'text-blue-600' : stage === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                {stage === 'files-selected' && <FileCheck className="w-4 h-4" />}
                {stage === 'converting' && <ConverterStatusIcon status="processing" size={16} />}
                {stage === 'completed' && <CheckCircle className="w-4 h-4" />}
                {stage === 'error' && <AlertCircle className="w-4 h-4" />}
                <span className="text-sm font-medium capitalize">{stage}</span>
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="text-sm text-gray-500">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
          
          {stage === 'converting' && (
            <Progress value={batchProgress} className="h-2" />
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-8">

          {/* Files Selected Stage */}
          {stage === 'files-selected' && selectedFiles.length > 0 && (
            <div className="space-y-6">
              {/* File Management Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''} Selected
                  </h3>
                  <p className="text-gray-600">
                    {validFilesCount} ready • {selectedFiles.length - validFilesCount} with issues
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={clearAllFiles}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>

              {/* File List */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedFiles.map((fileUpload, index) => (
                  <FileItem
                    key={fileUpload.id}
                    file={fileUpload.file}
                    index={index}
                    progressLabel={actionLabels.progress}
                    doneLabel={actionLabels.done}
                    status={fileUpload.status === "valid" && !canConvert ? "pending" : fileUpload.status}
                    progress={fileUpload.progress}
                    errorMessage={fileUpload.errorMessage}
                    validationMessage={fileUpload.status === "valid" && !canConvert
                      ? "Review the document or settings below before processing."
                      : fileUpload.validationMessage}
                    downloadUrl={fileUpload.downloadUrl}
                    onRemove={removeFile}
                    onDownload={downloadIndividualFile}
                  />
                ))}
              </div>

              {/* Add More Files Area */}
              {selectedFiles.length < maxFiles && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                <EnhancedUploadArea
                  acceptedFormats={acceptedFormats}
                  maxFileSize={effectiveMaxLabel}
                  maxFiles={maxFiles}
                  onFilesSelected={handleFilesSelection}
                  isDragOver={isDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  currentFileCount={selectedFiles.length}
                  showAdvancedFeatures={false}
                  toolId={toolType}
                />
              </div>
              )}

              {renderSettings?.({
                files: selectedFiles.filter(f => f.status === 'valid').map(f => f.file),
                disabled: isConverting,
              })}

              {/* Password field — Lock PDF / Unlock PDF only */}
              {needsPassword && (
                <div className="max-w-md mx-auto space-y-2">
                  <label htmlFor="pdf-password" className="block text-sm font-medium text-gray-900">
                    {toolType === 'lock-pdf' ? 'Set a password' : 'Enter the PDF password'}
                  </label>
                  <input
                    id="pdf-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={toolType === 'lock-pdf' ? 'Choose a strong password' : 'Current PDF password'}
                    autoComplete={toolType === 'lock-pdf' ? 'new-password' : 'current-password'}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20"
                    data-testid="input-pdf-password"
                  />
                  <p className="text-xs text-gray-500">
                    {toolType === 'lock-pdf'
                      ? 'Anyone who opens this PDF will need this password. Keep it safe — it cannot be recovered.'
                      : 'We need the current password to remove protection from this PDF.'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {hasValidFiles && (
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  <Button
                    onClick={isVideoCompress ? () => setLevelModalOpen(true) : startBatchConversion}
                    className="bg-[#f7433d] hover:bg-[#e03a35] text-white px-8 py-3"
                    disabled={isConverting || !passwordReady || !canConvert}
                    data-testid="button-convert"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {isVideoCompress
                      ? `Compress ${validFilesCount} Video${validFilesCount !== 1 ? 's' : ''}`
                      : `Convert ${validFilesCount} File${validFilesCount !== 1 ? 's' : ''} to ${outputLabel ?? outputFormat.toUpperCase()}`}
                  </Button>
                  <Button
                    onClick={resetWorkflow}
                    variant="outline"
                    className="px-8 py-3"
                    disabled={isConverting}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Converting Stage */}
          {stage === 'converting' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ConverterStatusIcon status="processing" size={88} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{actionLabels.progress} Files...</h3>
                <p className="text-gray-600">Please wait while we process your files</p>
              </div>
              
              {/* File List During Conversion */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedFiles.map((fileUpload, index) => (
                  <FileItem
                    key={fileUpload.id}
                    file={fileUpload.file}
                    index={index}
                    progressLabel={actionLabels.progress}
                    doneLabel={actionLabels.done}
                    status={fileUpload.status}
                    progress={fileUpload.progress}
                    errorMessage={fileUpload.errorMessage}
                    validationMessage={fileUpload.validationMessage}
                    downloadUrl={fileUpload.downloadUrl}
                    onRemove={removeFile}
                    onDownload={downloadIndividualFile}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Stage */}
          {stage === 'completed' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ConverterStatusIcon status={allFilesFailed ? 'error' : 'success'} size={88} />
              </div>
              <div>
                {allFilesFailed ? (
                  <>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      {actionLabels.done} failed
                    </h3>
                    <p className="text-gray-600">
                      We couldn&apos;t {actionLabels.base.toLowerCase()} your file
                      {failedFilesCount !== 1 ? 's' : ''}. See the details below.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">Files {actionLabels.done}!</h3>
                    <p className="text-gray-600">Your files have been successfully {actionLabels.done.toLowerCase()}</p>
                  </>
                )}
              </div>
              
              {/* File List After Completion */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedFiles.map((fileUpload, index) => (
                  <FileItem
                    key={fileUpload.id}
                    file={fileUpload.file}
                    index={index}
                    progressLabel={actionLabels.progress}
                    doneLabel={actionLabels.done}
                    status={fileUpload.status}
                    progress={fileUpload.progress}
                    errorMessage={fileUpload.errorMessage}
                    validationMessage={fileUpload.validationMessage}
                    downloadUrl={fileUpload.downloadUrl}
                    onRemove={removeFile}
                    onDownload={downloadIndividualFile}
                  />
                ))}
              </div>

              {/* Download Actions */}
              {hasCompletedFiles && (
                <div className="flex justify-center space-x-4 pt-4">
                  <Button
                    onClick={downloadAllFiles}
                    data-testid="button-download-all"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  >
                    Download All Files
                  </Button>
                  <Button
                    onClick={resetWorkflow}
                    variant="outline"
                    className="px-8 py-3"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Convert More Files
                  </Button>
                </div>
              )}
            </div>
          )}

          {stage === 'completed' && showSizeComparison && selectedFiles.some(f => f.status === 'completed' && f.outputSize) && (
            <div className="mt-6 space-y-2" data-testid="size-comparison">
              {selectedFiles.filter(f => f.status === 'completed' && f.outputSize).map(f => {
                const out = f.outputSize as number;
                const pct = ((f.file.size - out) / f.file.size) * 100;
                const saved = pct > 0;
                return (
                  <div key={f.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                    <p className="font-medium text-gray-900 truncate">{f.file.name}</p>
                    <p className="text-gray-700">Original {formatMB(f.file.size)} to {formatMB(out)} output</p>
                    <p className={saved ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {saved ? `${pct.toFixed(1)}% smaller` : pct === 0 ? 'No size change' : `${Math.abs(pct).toFixed(1)}% larger - this file could not be reduced further`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Stage */}
          {stage === 'error' && errorMessage && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ConverterStatusIcon status="error" size={88} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {authError ? 'Sign in required' : 'Conversion Failed'}
                </h3>
                <p className="text-red-600">{errorMessage}</p>
                {authError && (
                  <div className="mt-3">
                    <AuthErrorAction
                      to={authError.linkTo}
                      label={authError.linkLabel}
                      testId="link-workflow-auth"
                    />
                  </div>
                )}
              </div>
              <Button
                onClick={resetWorkflow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
      )}
      <LoginRequiredDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />

      {/* MP4 Compressor — compression level picker popup */}
      {isVideoCompress && (() => {
        const validForEstimate = selectedFiles.filter(f => f.status === 'valid');
        const totalBytes = validForEstimate.reduce((sum, f) => sum + f.file.size, 0);
        const displayName = validForEstimate.length === 1
          ? validForEstimate[0].file.name
          : `${validForEstimate.length} videos`;
        return (
          <Dialog open={levelModalOpen} onOpenChange={setLevelModalOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogTitle className="text-center text-3xl font-extrabold text-gray-900">
                Compress Video
              </DialogTitle>
              <DialogDescription className="sr-only">
                Select a compression level for your video
              </DialogDescription>

              <div className="flex items-center justify-between border-b border-gray-200 pb-3 text-sm">
                <span className="truncate pr-4 text-gray-500">{displayName}</span>
                <span className="shrink-0 font-medium text-gray-900">{formatMB(totalBytes)}</span>
              </div>

              <p className="pt-1 text-sm font-medium text-gray-500">Select compression level:</p>

              <div className="grid gap-3 sm:grid-cols-3">
                {VIDEO_LEVELS.map((lvl) => {
                  const selected = compressionLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setCompressionLevel(lvl.id)}
                      data-testid={`button-level-${lvl.id}`}
                      className={`relative rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? 'border-[#f7433d] ring-1 ring-[#f7433d]/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border ${
                          selected ? 'border-[#f7433d] bg-[#f7433d] text-white' : 'border-gray-300'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <h4 className="text-lg font-bold text-gray-900">{lvl.label}</h4>
                      <p className="mt-1 text-xs text-gray-500">{lvl.sub}</p>
                      <div className="mt-3 inline-block rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700">
                        Final size <span className="font-bold text-gray-900">~{formatMB(totalBytes * lvl.ratio)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => { setLevelModalOpen(false); startBatchConversion(); }}
                  disabled={isConverting || validForEstimate.length === 0}
                  className="w-full bg-[#f7433d] py-6 text-base font-semibold text-white hover:bg-[#e03a35]"
                  data-testid="button-compress-video"
                >
                  Compress
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </ToolPageShell>
  );
};