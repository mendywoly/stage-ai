"use client";

import { useCallback, useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";

interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

interface ImageUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export type { UploadedFile };

export function ImageUploader({ files, onFilesChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File): Promise<UploadedFile> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1];
          resolve({
            file,
            preview: dataUrl,
            base64,
            mimeType: file.type,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const imageFiles = Array.from(newFiles).filter((f) =>
        f.type.startsWith("image/")
      );
      const remaining = 5 - files.length;
      const toProcess = imageFiles.slice(0, remaining);

      const processed = await Promise.all(toProcess.map(processFile));
      onFilesChange([...files, ...processed]);
    },
    [files, onFilesChange, processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upload Photos</h2>
        <span className="text-sm text-muted-foreground">
          {files.length}/5 images
        </span>
      </div>

      {files.length < 5 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 transition-colors hover:border-violet-400 hover:bg-violet-50/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
            <Upload className="h-6 w-6 text-violet-600" />
          </div>
          <div className="text-center">
            <p className="font-medium">Drop room photos here or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">
              JPG, PNG, or WebP — up to 5 images
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {files.map((f, i) => (
            <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              <img
                src={f.preview}
                alt={f.file.name}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removeFile(i)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                <p className="truncate text-xs text-white">{f.file.name}</p>
              </div>
            </div>
          ))}
          {files.length < 5 && (
            <div
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-violet-400 hover:bg-violet-50/50"
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
