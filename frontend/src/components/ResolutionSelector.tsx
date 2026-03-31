import { useState } from "react";

interface Resolution {
  label: string;
  width: number;
  height: number;
}

const PRESETS: Resolution[] = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "1200 × 800", width: 1200, height: 800 },
  { label: "300 × 300", width: 300, height: 300 },
];

interface ResolutionSelectorProps {
  selected: { width: number; height: number } | null;
  onChange: (resolution: { width: number; height: number } | null) => void;
  isLocked: boolean;
  originalWidth?: number;
  originalHeight?: number;
}

export function ResolutionSelector({
  selected,
  onChange,
  isLocked,
  originalWidth,
  originalHeight,
}: ResolutionSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const handlePresetClick = (preset: Resolution) => {
    if (isLocked) return;
    setIsCustom(false);
    // If clicking the already-selected preset, deselect it
    if (
      selected &&
      selected.width === preset.width &&
      selected.height === preset.height
    ) {
      onChange(null);
    } else {
      onChange({ width: preset.width, height: preset.height });
    }
  };

  const handleOriginalClick = () => {
    if (isLocked) return;
    setIsCustom(false);
    if (originalWidth && originalHeight) {
      // If already selected as original, deselect
      if (
        selected &&
        selected.width === originalWidth &&
        selected.height === originalHeight
      ) {
        onChange(null);
      } else {
        onChange({ width: originalWidth, height: originalHeight });
      }
    }
  };

  const handleCustomToggle = () => {
    if (isLocked) return;
    if (isCustom) {
      setIsCustom(false);
      onChange(null);
    } else {
      setIsCustom(true);
      setCustomWidth("");
      setCustomHeight("");
      onChange(null);
    }
  };

  const handleCustomApply = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0 && w <= 10000 && h <= 10000) {
      onChange({ width: w, height: h });
    }
  };

  const isPresetSelected = (preset: Resolution) =>
    !isCustom &&
    selected !== null &&
    selected.width === preset.width &&
    selected.height === preset.height;

  const isOriginalSelected =
    !isCustom &&
    selected !== null &&
    originalWidth !== undefined &&
    originalHeight !== undefined &&
    selected.width === originalWidth &&
    selected.height === originalHeight;

  return (
    <div
      className={`mt-6 p-5 rounded-xl border transition-all duration-300 ${
        isLocked
          ? "bg-gray-50 border-gray-200 opacity-60"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {isLocked ? (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          </svg>
        )}
        <p className="text-sm font-semibold text-gray-700">
          Output Resolution
        </p>
        {isLocked && (
          <span className="text-xs text-gray-400 ml-1">
            — Upload an image to unlock
          </span>
        )}
      </div>

      {/* Original size badge */}
      {originalWidth && originalHeight && !isLocked && (
        <div className="mb-3">
          <button
            type="button"
            onClick={handleOriginalClick}
            className={`
              inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg
              border transition-all cursor-pointer w-full justify-center
              ${
                isOriginalSelected
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400"
              }
            `}
          >
            {isOriginalSelected && (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            Original — {originalWidth} × {originalHeight} px
          </button>
        </div>
      )}

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {PRESETS.map((preset) => {
          const active = isPresetSelected(preset);
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              disabled={isLocked}
              className={`
                relative px-3 py-3 text-sm font-medium rounded-lg border transition-all
                ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
                ${
                  active
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : isLocked
                    ? "bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }
              `}
            >
              {active && (
                <svg
                  className="w-3.5 h-3.5 absolute top-1.5 right-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              <span className="block text-center">{preset.label}</span>
              {/* <span
                className={`block text-[10px] mt-0.5 ${
                  active ? "text-blue-100" : "text-gray-400"
                }`}
              >
                px
              </span> */}
            </button>
          );
        })}
      </div>

      {/* Custom resolution */}
      <button
        type="button"
        onClick={handleCustomToggle}
        disabled={isLocked}
        className={`
          w-full px-3 py-2.5 text-sm font-medium rounded-lg border transition-all
          ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
          ${
            isCustom
              ? "bg-blue-600 text-white border-blue-600"
              : isLocked
              ? "bg-gray-100 text-gray-400 border-gray-200"
              : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
          }
        `}
      >
        {isCustom ? "✓ Custom Resolution" : "Custom Resolution"}
      </button>

      {/* Custom inputs */}
      {isCustom && !isLocked && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            placeholder="Width"
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            min={1}
            max={10000}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-400 text-sm font-medium">×</span>
          <input
            type="number"
            placeholder="Height"
            value={customHeight}
            onChange={(e) => setCustomHeight(e.target.value)}
            min={1}
            max={10000}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!customWidth || !customHeight}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Selected resolution summary */}
      {selected && !isLocked && (
        <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Output: {selected.width} × {selected.height} px in all 4 formats
          (AVIF, WebP, JPEG, PNG)
        </p>
      )}
    </div>
  );
}
