import { useState } from "react";
import type { ImageResult, VariantResult, UserFolder, FolderFileRef } from "../types";
import { FormatBadge, formatBytes } from "./FormatBadge";
import { ComparisonSlider } from "./ComparisonSlider";
import { MoveToFolderDropdown } from "./MoveToFolderDropdown";
import { getDownloadUrl } from "../api/client";

interface ImageCardProps {
  result: ImageResult;
  jobId: string;
  userFolders: UserFolder[];
  onCreateFolder: (name: string) => string;
  onMoveToFolder: (folderId: string, ref: FolderFileRef) => void;
  getFoldersForVariant: (variantFilename: string) => string[];
}

export function ImageCard({ result, jobId, userFolders, onCreateFolder, onMoveToFolder, getFoldersForVariant }: ImageCardProps) {
  // Get available size labels
  const sizes = [...new Set(result.variants.map((v) => v.size_label))];
  const defaultSize = sizes.includes("original") ? "original" : sizes[0] || "original";

  const [selectedSize, setSelectedSize] = useState(defaultSize);

  // Selected variant for comparison (separate from download)
  const [selectedVariant, setSelectedVariant] = useState<VariantResult | null>(
    () => {
      const filtered = result.variants.filter((v) => v.size_label === defaultSize);
      const webp = filtered.find((v) => v.format === "webp");
      return webp || filtered[0] || result.variants[0] || null;
    }
  );

  const filteredVariants = result.variants.filter(
    (v) => v.size_label === selectedSize
  );

  const originalUrl = getDownloadUrl(jobId, result.original_name);

  // When size changes, update the selected variant
  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    const sizeVariants = result.variants.filter((v) => v.size_label === size);
    const webp = sizeVariants.find((v) => v.format === "webp");
    setSelectedVariant(webp || sizeVariants[0] || null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{result.original_name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {result.original_width} x {result.original_height} &middot; {formatBytes(result.original_size)}
            </p>
          </div>
          {/* Resolution dropdown — only shown when multiple sizes exist */}
          {sizes.length > 1 && (
            <select
              value={selectedSize}
              onChange={(e) => handleSizeChange(e.target.value)}
              className="text-xs font-medium border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size === "original" ? `Original (${result.original_width}px)` : size}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Comparison slider */}
      <div className="px-6 py-5">
        {selectedVariant && (
          <ComparisonSlider
            originalUrl={originalUrl}
            optimizedUrl={getDownloadUrl(jobId, selectedVariant.filename)}
            originalName={result.original_name}
            originalSize={formatBytes(result.original_size)}
            optimizedSize={formatBytes(selectedVariant.file_size)}
            reductionPercent={selectedVariant.reduction_percent}
            format={selectedVariant.format}
          />
        )}
      </div>

      {/* Formats + Downloads */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">
          Available formats — click to compare
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {filteredVariants.map((variant) => (
            <FormatBadge
              key={`${variant.size_label}-${variant.format}`}
              variant={variant}
              isSelected={selectedVariant?.filename === variant.filename}
              onClick={() => setSelectedVariant(variant)}
            />
          ))}
        </div>

        {/* Download buttons + Move to Folder */}
        <div className="flex flex-wrap gap-2">
          {filteredVariants.map((variant) => (
            <div key={`dl-${variant.filename}`} className="flex items-center gap-1">
              <a
                href={getDownloadUrl(jobId, variant.filename)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {variant.format.toUpperCase()} ({formatBytes(variant.file_size)})
              </a>
              <MoveToFolderDropdown
                variant={variant}
                jobId={jobId}
                originalName={result.original_name}
                userFolders={userFolders}
                assignedFolderIds={getFoldersForVariant(variant.filename)}
                onMoveToFolder={onMoveToFolder}
                onCreateFolder={onCreateFolder}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
