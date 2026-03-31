import { useState, useCallback } from "react";
import { uploadImages } from "../api/client";
import type { UploadResponse } from "../types";

interface PerImageResolution {
  [filename: string]: { width: number; height: number };
}

interface UseUploadReturn {
  upload: (files: File[], resolutions: PerImageResolution) => Promise<UploadResponse>;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: File[], resolutions: PerImageResolution): Promise<UploadResponse> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response = await uploadImages(files, resolutions, (percent) => {
        setUploadProgress(percent);
      });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setUploadProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  return { upload, uploadProgress, isUploading, error, reset };
}
