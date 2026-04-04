import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isDisabled: boolean;
}

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/tiff": [".tiff", ".tif"],
};

export function UploadZone({ onFilesSelected, isDisabled }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 20,
    disabled: isDisabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        ${isDragActive
          ? "border-blue-500 bg-blue-50 scale-[1.01]"
          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }
        ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">Drop your images here...</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700">
              Drag & drop images here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              JPEG, PNG, WebP, GIF, TIFF — up to 100MB each, 20 files max
            </p>
          </>
        )}
      </div>
    </div>
  );
}
