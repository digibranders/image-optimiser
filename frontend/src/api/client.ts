import type { UploadResponse, JobStatusResponse } from "../types";

const API_BASE = "";

interface PerImageResolution {
  [filename: string]: { width: number; height: number };
}

export async function uploadImages(
  files: File[],
  resolutions: PerImageResolution,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    if (Object.keys(resolutions).length > 0) {
      formData.append("resolutions_map", JSON.stringify(resolutions));
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/status/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail);
  }
  return res.json();
}

export function getDownloadUrl(jobId: string, filename: string): string {
  return `${API_BASE}/download/${jobId}?file=${encodeURIComponent(filename)}`;
}

export function getDownloadAllUrl(jobId: string): string {
  return `${API_BASE}/download-all/${jobId}`;
}
