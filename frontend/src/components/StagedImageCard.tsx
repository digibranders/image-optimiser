import { useState } from "react";

interface Resolution {
  width: number;
  height: number;
}

const PRESETS: { label: string; width: number; height: number }[] = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "1200 × 800", width: 1200, height: 800 },
  { label: "300 × 300", width: 300, height: 300 },
];

export interface StagedImage {
  id: string;
  file: File;
  preview: string;
  dimensions: { width: number; height: number } | null;
  resolution: Resolution | null;
}

interface StagedImageCardProps {
  image: StagedImage;
  onResolutionChange: (id: string, resolution: Resolution | null) => void;
  onRemove: (id: string) => void;
}

export function StagedImageCard({ image, onResolutionChange, onRemove }: StagedImageCardProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePreset = (preset: { width: number; height: number }) => {
    setIsCustom(false);
    if (
      image.resolution &&
      image.resolution.width === preset.width &&
      image.resolution.height === preset.height
    ) {
      onResolutionChange(image.id, null);
    } else {
      onResolutionChange(image.id, { width: preset.width, height: preset.height });
    }
  };

  const handleOriginal = () => {
    if (!image.dimensions) return;
    setIsCustom(false);
    if (
      image.resolution &&
      image.dimensions &&
      image.resolution.width === image.dimensions.width &&
      image.resolution.height === image.dimensions.height
    ) {
      onResolutionChange(image.id, null);
    } else {
      onResolutionChange(image.id, { width: image.dimensions.width, height: image.dimensions.height });
    }
  };

  const handleCustomToggle = () => {
    if (isCustom) {
      setIsCustom(false);
      onResolutionChange(image.id, null);
    } else {
      setIsCustom(true);
      setCustomWidth("");
      setCustomHeight("");
      onResolutionChange(image.id, null);
    }
  };

  const handleCustomApply = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0 && w <= 10000 && h <= 10000) {
      onResolutionChange(image.id, { width: w, height: h });
    }
  };

  const isPresetActive = (p: { width: number; height: number }) =>
    !isCustom && image.resolution?.width === p.width && image.resolution?.height === p.height;

  const isOriginalActive =
    !isCustom &&
    image.dimensions !== null &&
    image.resolution?.width === image.dimensions?.width &&
    image.resolution?.height === image.dimensions?.height;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex">
        {/* Thumbnail */}
        <div className="w-28 h-28 flex-shrink-0 bg-gray-100 relative overflow-hidden">
          <img
            src={image.preview}
            alt={image.file.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info + resolution */}
        <div className="flex-1 p-3 min-w-0">
          {/* File info row */}
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{image.file.name}</p>
              <p className="text-xs text-gray-500">
                {image.dimensions
                  ? `${image.dimensions.width} × ${image.dimensions.height} px`
                  : "Loading..."}{" "}
                — {formatSize(image.file.size)}
              </p>
            </div>
            <button
              onClick={() => onRemove(image.id)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0 cursor-pointer"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Resolution picker — compact row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Original */}
            {image.dimensions && (
              <button
                type="button"
                onClick={handleOriginal}
                className={`
                  px-2 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer
                  ${isOriginalActive
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400"
                  }
                `}
              >
                Original
              </button>
            )}

            {/* Presets */}
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className={`
                  px-2 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer
                  ${isPresetActive(p)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }
                `}
              >
                {p.label}
              </button>
            ))}

            {/* Custom toggle */}
            <button
              type="button"
              onClick={handleCustomToggle}
              className={`
                px-2 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer
                ${isCustom
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }
              `}
            >
              Custom
            </button>
          </div>

          {/* Custom inputs */}
          {isCustom && (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="number"
                placeholder="W"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                min={1}
                max={10000}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-xs">×</span>
              <input
                type="number"
                placeholder="H"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                min={1}
                max={10000}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleCustomApply}
                disabled={!customWidth || !customHeight}
                className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Set
              </button>
            </div>
          )}

          {/* Selected indicator */}
          {image.resolution && (
            <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {image.resolution.width} × {image.resolution.height} px → 4 formats
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
