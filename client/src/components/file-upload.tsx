import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, X, FileImage, Eye, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Tesseract from 'tesseract.js';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  enableOCR?: boolean;
  onOCRResults?: (results: { [fileName: string]: string }) => void;
}

interface FileWithOCR extends File {
  ocrText?: string;
  ocrStatus?: 'pending' | 'processing' | 'completed' | 'error';
  ocrProgress?: number;
}

export default function FileUpload({ 
  files, 
  onFilesChange, 
  maxFiles = 10, 
  maxSize = 10 * 1024 * 1024, // 10MB 
  enableOCR = true,
  onOCRResults
}: FileUploadProps) {
  
  const [filesWithOCR, setFilesWithOCR] = useState<FileWithOCR[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
    onFilesChange(newFiles);
    
    if (enableOCR) {
      const newFilesWithOCR = acceptedFiles.map(file => ({
        ...file,
        ocrStatus: 'pending' as const,
        ocrProgress: 0
      }));
      setFilesWithOCR(prev => [...prev, ...newFilesWithOCR]);
    }
  }, [files, onFilesChange, maxFiles, enableOCR]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize,
    multiple: true,
  });

  const processImageOCR = useCallback(async (file: File, index: number) => {
    if (!enableOCR || !file.type.startsWith('image/')) return;
    
    setFilesWithOCR(prev => 
      prev.map((f, i) => i === index ? { ...f, ocrStatus: 'processing', ocrProgress: 0 } : f)
    );
    
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            setFilesWithOCR(prev => 
              prev.map((f, i) => i === index ? { ...f, ocrProgress: progress } : f)
            );
          }
        }
      });
      
      const extractedText = result.data.text.trim();
      setFilesWithOCR(prev => 
        prev.map((f, i) => i === index ? { 
          ...f, 
          ocrText: extractedText, 
          ocrStatus: 'completed',
          ocrProgress: 100 
        } : f)
      );
      
      if (onOCRResults) {
        onOCRResults({ [file.name]: extractedText });
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      setFilesWithOCR(prev => 
        prev.map((f, i) => i === index ? { ...f, ocrStatus: 'error', ocrProgress: 0 } : f)
      );
    }
  }, [enableOCR, onOCRResults]);
  
  const processAllOCR = useCallback(async () => {
    if (!enableOCR) return;
    
    setIsProcessingOCR(true);
    const imageFiles = filesWithOCR.filter(f => f.type.startsWith('image/') && f.ocrStatus === 'pending');
    
    for (let i = 0; i < imageFiles.length; i++) {
      const fileIndex = filesWithOCR.findIndex(f => f === imageFiles[i]);
      await processImageOCR(imageFiles[i], fileIndex);
    }
    
    setIsProcessingOCR(false);
  }, [enableOCR, filesWithOCR, processImageOCR]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
    setFilesWithOCR(prev => prev.filter((_, i) => i !== index));
  };
  
  const getOCRStatus = (fileName: string) => {
    return filesWithOCR.find(f => f.name === fileName);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Result Sheet Photos
      </label>
      
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-primary-400 bg-primary-50" 
            : "border-gray-300 hover:border-primary-400"
        )}
        data-testid="file-upload-dropzone"
      >
        <input {...getInputProps()} />
        <CloudUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium text-primary-600 hover:text-primary-500">
            Click to upload
          </span> 
          {" "}or drag and drop
        </p>
        <p className="text-xs text-gray-500">PNG, JPG, PDF up to {formatFileSize(maxSize)} each</p>
        {enableOCR && (
          <p className="text-xs text-primary-600 mt-1">
            <Zap className="h-3 w-3 inline mr-1" />OCR text extraction enabled for images
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
            {enableOCR && files.some(f => f.type.startsWith('image/')) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={processAllOCR}
                disabled={isProcessingOCR}
                data-testid="button-process-ocr"
              >
                <Zap className="h-4 w-4 mr-1" />
                {isProcessingOCR ? 'Processing...' : 'Extract Text'}
              </Button>
            )}
          </div>
          
          {files.map((file, index) => {
            const ocrFile = getOCRStatus(file.name);
            return (
              <Card key={index} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileImage className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900" data-testid={`file-name-${index}`}>
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500" data-testid={`file-size-${index}`}>
                            {formatFileSize(file.size)}
                          </p>
                          {enableOCR && file.type.startsWith('image/') && ocrFile && (
                            <Badge 
                              variant={ocrFile.ocrStatus === 'completed' ? 'default' : 
                                      ocrFile.ocrStatus === 'error' ? 'destructive' : 
                                      ocrFile.ocrStatus === 'processing' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {ocrFile.ocrStatus === 'pending' && <Eye className="h-3 w-3 mr-1" />}
                              {ocrFile.ocrStatus === 'processing' && <Zap className="h-3 w-3 mr-1" />}
                              {ocrFile.ocrStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {ocrFile.ocrStatus === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {ocrFile.ocrStatus === 'processing' ? `${ocrFile.ocrProgress}%` : 
                               ocrFile.ocrStatus === 'completed' ? 'Text Extracted' :
                               ocrFile.ocrStatus === 'error' ? 'OCR Failed' : 'Ready for OCR'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {enableOCR && ocrFile?.ocrText && ocrFile.ocrStatus === 'completed' && (
                    <div className="bg-gray-50 rounded-md p-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Extracted Text:</h5>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap" data-testid={`ocr-text-${index}`}>
                        {ocrFile.ocrText}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
