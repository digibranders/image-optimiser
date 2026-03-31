import { getDownloadAllUrl } from "../api/client";

interface DownloadButtonProps {
  jobId: string;
}

export function DownloadButton({ jobId }: DownloadButtonProps) {
  return (
    <a
      href={getDownloadAllUrl(jobId)}
      download
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download All Optimized Images (ZIP)
    </a>
  );
}
