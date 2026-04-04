export interface VariantResult {
  format: string;
  size_label: string;
  width: number;
  height: number;
  file_size: number;
  reduction_percent: number;
  filename: string;
}

export interface ImageResult {
  original_name: string;
  original_size: number;
  original_width: number;
  original_height: number;
  variants: VariantResult[];
}

export interface UploadResponse {
  job_id: string;
  file_count: number;
  status: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: "processing" | "complete" | "error";
  progress: number;
  results: ImageResult[];
  total_original_size: number;
  total_optimized_size: number;
  total_reduction_percent: number;
  error: string | null;
}

export interface FolderNode {
  name: string;
  type: "folder" | "file";
  size?: number;
  filename?: string;
  format?: string;
  children?: FolderNode[];
}

export interface FolderFileRef {
  jobId: string;
  originalName: string;
  variant: VariantResult;
}

export interface UserFolder {
  id: string;
  name: string;
  files: FolderFileRef[];
  subfolders: UserFolder[];
}
