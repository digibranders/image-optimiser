import type { VariantResult } from "../types";

interface FormatBadgeProps {
  variant: VariantResult;
  isSelected: boolean;
  onClick: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getBadgeColor(reduction: number): string {
  if (reduction >= 70) return "bg-green-100 text-green-800 border-green-300";
  if (reduction >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-gray-100 text-gray-800 border-gray-300";
}

export function FormatBadge({ variant, isSelected, onClick }: FormatBadgeProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        border transition-all cursor-pointer
        ${getBadgeColor(variant.reduction_percent)}
        ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}
      `}
    >
      <span className="uppercase font-bold">{variant.format}</span>
      <span>{formatBytes(variant.file_size)}</span>
      <span className="text-green-600">-{variant.reduction_percent}%</span>
    </button>
  );
}

export { formatBytes };
