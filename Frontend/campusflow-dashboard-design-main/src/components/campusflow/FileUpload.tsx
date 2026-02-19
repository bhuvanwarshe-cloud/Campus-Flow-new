import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface FileUploadProps {
    onUploadComplete?: (fileData: any) => void;
    bucket?: string;
    path?: string;
    accept?: string;
    maxSizeMB?: number;
    className?: string;
}

export function FileUpload({
    onUploadComplete,
    bucket = 'course-materials',
    path = '',
    accept = '*',
    maxSizeMB = 5,
    className
}: FileUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate size
        if (selectedFile.size > maxSizeMB * 1024 * 1024) {
            setError(`File size exceeds ${maxSizeMB}MB limit.`);
            return;
        }

        setFile(selectedFile);
        setError(null);
        setSuccess(false);
        setProgress(0);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setProgress(10); // Start progress

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        if (path) formData.append('path', path);

        try {
            // Simulate progress (since axios upload progress is erratic without proper config)
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await api.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            clearInterval(interval);
            setProgress(100);
            setSuccess(true);

            if (onUploadComplete) {
                onUploadComplete(response.data.data);
            }

            // Reset after delay? No, keep success state visible.
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.response?.data?.error?.message || 'Upload failed. Please try again.');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setError(null);
        setSuccess(false);
        setProgress(0);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className={cn("w-full space-y-3", className)}>
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors",
                    file ? "border-brand2/50 bg-brand2/5" : "border-muted-foreground/25 hover:border-brand2/50 hover:bg-muted/20",
                    error && "border-destructive/50 bg-destructive/5"
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {!file ? (
                    <div className="space-y-2 cursor-pointer" onClick={() => inputRef.current?.click()}>
                        <div className="p-3 bg-background rounded-full inline-block shadow-sm">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold text-brand2">Click to upload</span> or drag and drop
                        </div>
                        <p className="text-xs text-muted-foreground">
                            SVG, PNG, JPG or PDF (max. {maxSizeMB}MB)
                        </p>
                    </div>
                ) : (
                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-background rounded border shadow-sm">
                            <div className="p-2 bg-muted rounded">
                                <FileText className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            {!uploading && !success && (
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                            {success && <CheckCircle className="h-5 w-5 text-green-500" />}
                        </div>

                        {uploading && (
                            <div className="space-y-1.5">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        {!success && (
                            <Button
                                className="w-full"
                                onClick={handleUpload}
                                disabled={uploading}
                            >
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {uploading ? "Uploading..." : "Upload File"}
                            </Button>
                        )}

                        {success && (
                            <Button variant="outline" className="w-full" onClick={clearFile}>
                                Upload Another
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
