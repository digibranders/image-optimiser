import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import type { ImageResult, FolderNode, UserFolder, FolderFileRef } from "../types";
import { getDownloadUrl } from "../api/client";
import { formatBytes } from "./FormatBadge";

/** Collect all FolderFileRefs from a folder recursively (for ZIP) */
function collectAllFiles(folder: UserFolder): FolderFileRef[] {
  return [
    ...folder.files,
    ...folder.subfolders.flatMap(collectAllFiles),
  ];
}

/** Download a folder (and optionally its subfolders) as a ZIP file */
async function downloadAsZip(folder: UserFolder, includeSubfolders: boolean) {
  const zip = new JSZip();

  const addFiles = (f: UserFolder, zipFolder: JSZip, depth: boolean) => {
    for (const file of f.files) {
      const url = getDownloadUrl(file.jobId, file.variant.filename);
      // We fetch each file and add it to the zip
      zip.file(file.variant.filename, fetch(url).then((r) => r.blob()));
    }
    if (depth) {
      for (const sub of f.subfolders) {
        const subZipFolder = zipFolder.folder(sub.name)!;
        addFilesIntoFolder(sub, subZipFolder, true);
      }
    }
  };

  const addFilesIntoFolder = (f: UserFolder, zipFolder: JSZip, recursive: boolean) => {
    for (const file of f.files) {
      const url = getDownloadUrl(file.jobId, file.variant.filename);
      zipFolder.file(file.variant.filename, fetch(url).then((r) => r.blob()));
    }
    if (recursive) {
      for (const sub of f.subfolders) {
        const subZipFolder = zipFolder.folder(sub.name)!;
        addFilesIntoFolder(sub, subZipFolder, true);
      }
    }
  };

  addFiles(folder, zip, includeSubfolders);

  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${folder.name}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

interface FolderTreeProps {
  results: ImageResult[];
  jobId: string;
  userFolders: UserFolder[];
  onCreateFolder: (name: string) => string;
  onCreateSubfolder: (parentId: string, name: string) => string;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRemoveFromFolder: (folderId: string, variantFilename: string) => void;
}

// ── Auto-generated output tree ───────────────────────────────────────────────

function buildTree(results: ImageResult[]): FolderNode {
  const root: FolderNode = { name: "optimized", type: "folder", children: [] };

  for (const result of results) {
    const stem = result.original_name.replace(/\.[^.]+$/, "");
    const imageFolder: FolderNode = { name: stem, type: "folder", children: [] };

    const sizeGroups: Record<string, typeof result.variants> = {};
    for (const v of result.variants) {
      if (!sizeGroups[v.size_label]) sizeGroups[v.size_label] = [];
      sizeGroups[v.size_label].push(v);
    }
    const sizeLabels = Object.keys(sizeGroups);

    if (sizeLabels.length === 1) {
      for (const variant of result.variants) {
        imageFolder.children!.push({
          name: variant.filename, type: "file",
          size: variant.file_size, filename: variant.filename, format: variant.format,
        });
      }
    } else {
      for (const sizeLabel of sizeLabels) {
        const sizeFolder: FolderNode = { name: sizeLabel, type: "folder", children: [] };
        for (const variant of sizeGroups[sizeLabel]) {
          sizeFolder.children!.push({
            name: variant.filename, type: "file",
            size: variant.file_size, filename: variant.filename, format: variant.format,
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

function FolderNodeItem({ node, jobId, depth }: { node: FolderNode; jobId: string; depth: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <a
        href={getDownloadUrl(jobId, node.filename || node.name)}
        download
        className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-blue-50 transition-colors group cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <svg className={`w-4 h-4 flex-shrink-0 ${getFormatColor(node.format)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-blue-700">{node.name}</span>
        {node.size !== undefined && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatBytes(node.size)}</span>
        )}
        <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    );
  }

  const childCount = node.children?.length || 0;
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-100 transition-colors w-full text-left cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <svg className={`w-4 h-4 flex-shrink-0 ${isOpen ? "text-blue-500" : "text-yellow-500"}`} fill="currentColor" viewBox="0 0 20 20">
          {isOpen ? <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H2V6z" /> : <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />}
          {isOpen && <path d="M4 10h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2z" />}
        </svg>
        <span className="text-xs font-medium text-gray-800 truncate flex-1">{node.name}</span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{childCount} item{childCount !== 1 ? "s" : ""}</span>
      </button>
      {isOpen && node.children && (
        <div>
          {node.children.map((child, i) => (
            <FolderNodeItem key={`${child.name}-${i}`} node={child} jobId={jobId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline name input (reused for create/rename) ─────────────────────────────

function InlineNameInput({
  placeholder,
  initialValue = "",
  indent,
  onConfirm,
  onCancel,
}: {
  placeholder: string;
  initialValue?: string;
  indent: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialValue) inputRef.current?.select();
  }, [initialValue]);

  return (
    <div className="flex items-center gap-1.5 py-1.5" style={{ paddingLeft: `${indent}px`, paddingRight: "8px" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { const t = value.trim(); if (t) onConfirm(t); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      <button type="button" onClick={() => { const t = value.trim(); if (t) onConfirm(t); }} disabled={!value.trim()}
        className="p-0.5 text-blue-600 hover:text-blue-800 disabled:text-gray-300 cursor-pointer">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button type="button" onClick={onCancel} className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── User folder node (recursive) ─────────────────────────────────────────────

interface FolderHandlers {
  onCreateSubfolder: (parentId: string, name: string) => string;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRemoveFromFolder: (folderId: string, variantFilename: string) => void;
}

function UserFolderNode({
  folder,
  jobId,
  depth,
  handlers,
}: {
  folder: UserFolder;
  jobId: string;
  depth: number;
  handlers: FolderHandlers;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<"idle" | "renaming" | "creating-sub" | "confirm-delete">("idle");
  const [isZipping, setIsZipping] = useState<"folder" | "all" | null>(null);

  const indent = depth * 16 + 8;

  const handleDownloadZip = async (includeSubfolders: boolean) => {
    setIsZipping(includeSubfolders ? "all" : "folder");
    try {
      await downloadAsZip(folder, includeSubfolders);
    } finally {
      setIsZipping(null);
    }
  };

  const totalItems = folder.files.length + folder.subfolders.length;
  const hasAnyFiles = collectAllFiles(folder).length > 0;
  const hasSubfolderFiles = folder.subfolders.flatMap(collectAllFiles).length > 0;

  return (
    <div>
      {/* Folder row */}
      {mode === "renaming" ? (
        <InlineNameInput
          placeholder="Folder name"
          initialValue={folder.name}
          indent={indent}
          onConfirm={(name) => { handlers.onRenameFolder(folder.id, name); setMode("idle"); }}
          onCancel={() => setMode("idle")}
        />
      ) : (
        <div className="group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-gray-100 transition-colors"
          style={{ paddingLeft: `${indent}px` }}>
          {/* Expand toggle + icon + name */}
          <button type="button" onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer">
            <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-xs font-medium text-gray-800 truncate flex-1">{folder.name}</span>
          </button>

          {/* Actions (hover) */}
          {mode === "idle" && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <span className="text-[10px] text-gray-400 mr-0.5">{totalItems}</span>
              {/* Add subfolder */}
              <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(true); setMode("creating-sub"); }}
                className="p-0.5 text-gray-400 hover:text-blue-600 cursor-pointer" title="Add subfolder">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </button>
              {/* Rename */}
              <button type="button" onClick={(e) => { e.stopPropagation(); setMode("renaming"); }}
                className="p-0.5 text-gray-400 hover:text-blue-600 cursor-pointer" title="Rename">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {/* Delete */}
              <button type="button" onClick={(e) => { e.stopPropagation(); setMode("confirm-delete"); }}
                className="p-0.5 text-gray-400 hover:text-red-600 cursor-pointer" title="Delete">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Delete confirmation inline */}
          {mode === "confirm-delete" && (
            <div className="flex items-center gap-1 text-[10px] flex-shrink-0">
              <span className="text-red-600">Delete?</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); handlers.onDeleteFolder(folder.id); }}
                className="text-red-600 font-medium hover:underline cursor-pointer">Yes</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setMode("idle"); }}
                className="text-gray-500 hover:underline cursor-pointer">No</button>
            </div>
          )}
        </div>
      )}

      {/* Folder contents */}
      {isOpen && (
        <div>
          {/* Inline subfolder creation */}
          {mode === "creating-sub" && (
            <InlineNameInput
              placeholder="Subfolder name"
              indent={indent + 24}
              onConfirm={(name) => { handlers.onCreateSubfolder(folder.id, name); setMode("idle"); }}
              onCancel={() => setMode("idle")}
            />
          )}

          {/* Subfolders (recursive) */}
          {folder.subfolders.map((sub) => (
            <UserFolderNode
              key={sub.id}
              folder={sub}
              jobId={jobId}
              depth={depth + 1}
              handlers={handlers}
            />
          ))}

          {/* Files */}
          {folder.files.length === 0 && folder.subfolders.length === 0 && mode !== "creating-sub" && (
            <p className="text-[10px] text-gray-400 py-1" style={{ paddingLeft: `${indent + 24}px` }}>Empty</p>
          )}

          {folder.files.map((file) => (
            <div key={file.variant.filename}
              className="group/file flex items-center gap-2 py-1 px-2 rounded-md hover:bg-blue-50 transition-colors"
              style={{ paddingLeft: `${indent + 24}px` }}>
              <a href={getDownloadUrl(file.jobId, file.variant.filename)} download
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                <svg className={`w-3.5 h-3.5 flex-shrink-0 ${getFormatColor(file.variant.format)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-700 truncate flex-1">{file.variant.filename}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatBytes(file.variant.file_size)}</span>
              </a>
              <button type="button" onClick={() => handlers.onRemoveFromFolder(folder.id, file.variant.filename)}
                className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/file:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                title="Remove from folder">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Download buttons */}
          {hasAnyFiles && (
            <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5" style={{ paddingLeft: `${indent + 24}px` }}>
              {/* Download this folder's direct files only */}
              {folder.files.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadZip(false)}
                  disabled={isZipping !== null}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Download files in this folder only (no subfolders)"
                >
                  {isZipping === "folder" ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {isZipping === "folder" ? "Zipping…" : `Folder ZIP (${folder.files.length})`}
                </button>
              )}

              {/* Download this folder + all subfolders recursively */}
              {hasSubfolderFiles && (
                <button
                  type="button"
                  onClick={() => handleDownloadZip(true)}
                  disabled={isZipping !== null}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Download this folder and all subfolders as one ZIP"
                >
                  {isZipping === "all" ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  )}
                  {isZipping === "all" ? "Zipping…" : `With Subfolders ZIP (${collectAllFiles(folder).length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root FolderTree export ────────────────────────────────────────────────────

export function FolderTree({
  results, jobId, userFolders,
  onCreateFolder, onCreateSubfolder, onRenameFolder, onDeleteFolder, onRemoveFromFolder,
}: FolderTreeProps) {
  const tree = buildTree(results);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handlers: FolderHandlers = { onCreateSubfolder, onRenameFolder, onDeleteFolder, onRemoveFromFolder };

  return (
    <div className="space-y-4">
      {/* Output Files tree */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700">Output Files</h3>
          </div>
        </div>
        <div className="py-2 max-h-[calc(100vh-480px)] overflow-y-auto">
          {tree.children && tree.children.length > 0 ? (
            tree.children.map((child, i) => (
              <FolderNodeItem key={`${child.name}-${i}`} node={child} jobId={jobId} depth={0} />
            ))
          ) : (
            <p className="text-xs text-gray-400 px-4 py-3">No files yet</p>
          )}
        </div>
      </div>

      {/* My Folders */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-700">My Folders</h3>
            </div>
            <button type="button" onClick={() => setIsCreatingFolder(true)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="New folder">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="py-2 max-h-[calc(100vh-480px)] overflow-y-auto">
          {/* Inline root folder creation */}
          {isCreatingFolder && (
            <InlineNameInput
              placeholder="Folder name"
              indent={8}
              onConfirm={(name) => { onCreateFolder(name); setIsCreatingFolder(false); }}
              onCancel={() => setIsCreatingFolder(false)}
            />
          )}

          {userFolders.length === 0 && !isCreatingFolder ? (
            <p className="text-xs text-gray-400 px-4 py-3">Create folders to organize your downloads</p>
          ) : (
            userFolders.map((folder) => (
              <UserFolderNode
                key={folder.id}
                folder={folder}
                jobId={jobId}
                depth={0}
                handlers={handlers}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
