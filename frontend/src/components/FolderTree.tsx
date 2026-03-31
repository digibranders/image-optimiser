import { useState } from "react";
import type { ImageResult, FolderNode } from "../types";
import { getDownloadUrl } from "../api/client";
import { formatBytes } from "./FormatBadge";

interface FolderTreeProps {
  results: ImageResult[];
  jobId: string;
}

function buildTree(results: ImageResult[]): FolderNode {
  const root: FolderNode = { name: "optimized", type: "folder", children: [] };

  for (const result of results) {
    const stem = result.original_name.replace(/\.[^.]+$/, "");
    const imageFolder: FolderNode = { name: stem, type: "folder", children: [] };

    // Group variants by size_label
    const sizeGroups: Record<string, typeof result.variants> = {};
    for (const v of result.variants) {
      if (!sizeGroups[v.size_label]) sizeGroups[v.size_label] = [];
      sizeGroups[v.size_label].push(v);
    }

    const sizeLabels = Object.keys(sizeGroups);

    if (sizeLabels.length === 1) {
      // Only original — flat list
      for (const variant of result.variants) {
        imageFolder.children!.push({
          name: variant.filename,
          type: "file",
          size: variant.file_size,
          filename: variant.filename,
          format: variant.format,
        });
      }
    } else {
      // Multiple resolutions — subfolder per size
      for (const sizeLabel of sizeLabels) {
        const sizeFolder: FolderNode = {
          name: sizeLabel,
          type: "folder",
          children: [],
        };
        for (const variant of sizeGroups[sizeLabel]) {
          sizeFolder.children!.push({
            name: variant.filename,
            type: "file",
            size: variant.file_size,
            filename: variant.filename,
            format: variant.format,
          });
        }
        imageFolder.children!.push(sizeFolder);
      }
    }

    root.children!.push(imageFolder);
  }

  return root;
}

function getFormatColor(format?: string): string {
  switch (format) {
    case "avif": return "text-emerald-600";
    case "webp": return "text-blue-600";
    case "jpg": case "jpeg": return "text-orange-600";
    case "png": return "text-purple-600";
    default: return "text-gray-600";
  }
}

function FolderNodeItem({
  node,
  jobId,
  depth,
}: {
  node: FolderNode;
  jobId: string;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <a
        href={getDownloadUrl(jobId, node.filename || node.name)}
        download
        className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-blue-50 transition-colors group cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* File icon */}
        <svg className={`w-4 h-4 flex-shrink-0 ${getFormatColor(node.format)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-blue-700">
          {node.name}
        </span>
        {node.size !== undefined && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {formatBytes(node.size)}
          </span>
        )}
        {/* Download icon on hover */}
        <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    );
  }

  // Folder
  const childCount = node.children?.length || 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-100 transition-colors w-full text-left cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {/* Folder icon */}
        <svg className={`w-4 h-4 flex-shrink-0 ${isOpen ? "text-blue-500" : "text-yellow-500"}`} fill="currentColor" viewBox="0 0 20 20">
          {isOpen ? (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H2V6z" />
          ) : (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          )}
          {isOpen && <path d="M4 10h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2z" />}
        </svg>
        <span className="text-xs font-medium text-gray-800 truncate flex-1">
          {node.name}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">
          {childCount} item{childCount !== 1 ? "s" : ""}
        </span>
      </button>
      {isOpen && node.children && (
        <div>
          {node.children.map((child, i) => (
            <FolderNodeItem
              key={`${child.name}-${i}`}
              node={child}
              jobId={jobId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ results, jobId }: FolderTreeProps) {
  const tree = buildTree(results);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">Output Files</h3>
        </div>
      </div>
      {/* Tree */}
      <div className="py-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {tree.children && tree.children.length > 0 ? (
          tree.children.map((child, i) => (
            <FolderNodeItem
              key={`${child.name}-${i}`}
              node={child}
              jobId={jobId}
              depth={0}
            />
          ))
        ) : (
          <p className="text-xs text-gray-400 px-4 py-3">No files yet</p>
        )}
      </div>
    </div>
  );
}
