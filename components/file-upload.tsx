'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, File, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export function FileUpload({ onUpload, isLoading = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type (also accept files with no type but csv/xlsx extension)
    const validTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream', // For some CSV/Excel files
    ];

    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isValidType = validTypes.includes(file.type);

    if (!isValidType && !isValidExtension) {
      console.error('[v0] Invalid file type:', file.type, 'Extension:', fileName);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    setUploadStatus('loading');
    setUploadedFile(file);

    try {
      console.log('[v0] Starting upload for file:', file.name);
      await onUpload(file);
      console.log('[v0] Upload completed successfully');
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 2000);
    } catch (error) {
      console.error('[v0] Upload error:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>

          <div>
            <h3 className="font-semibold text-foreground">
              {uploadedFile ? uploadedFile.name : 'Drop your file here'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              CSV, Excel, or similar formats
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || uploadStatus === 'loading'}
            className="rounded-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploadStatus === 'loading' ? 'Uploading...' : 'Choose File'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            hidden
          />
        </div>
      </Card>

      {uploadStatus === 'success' && (
        <Card className="bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">
              {uploadedFile?.name} uploaded successfully!
            </p>
            <p className="text-sm text-green-700">You can now ask questions about your data</p>
          </div>
        </Card>
      )}

      {uploadStatus === 'error' && (
        <Card className="bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Upload failed</p>
            <p className="text-sm text-red-700">Please try again with a valid CSV or Excel file</p>
          </div>
        </Card>
      )}
    </div>
  );
}
