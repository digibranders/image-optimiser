import { formatBytes } from "./FormatBadge";
import { getDownloadAllUrl } from "../api/client";

interface StatsBarProps {
  jobId: string;
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalReductionPercent: number;
  fileCount: number;
}

export function StatsBar({
  jobId,
  totalOriginalSize,
  totalOptimizedSize,
  totalReductionPercent,
  fileCount,
}: StatsBarProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Files</p>
          <p className="text-xl font-bold text-gray-900">{fileCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Original</p>
          <p className="text-xl font-bold text-gray-900">{formatBytes(totalOriginalSize)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Optimized</p>
          <p className="text-xl font-bold text-green-600">{formatBytes(totalOptimizedSize)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Saved</p>
          <p className="text-xl font-bold text-green-600">{totalReductionPercent}%</p>
        </div>
      </div>

      <a
        href={getDownloadAllUrl(jobId)}
        download
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download All (ZIP)
      </a>
    </div>
  );
}
