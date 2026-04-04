import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { UserFolder, FolderFileRef, VariantResult } from "../types";

interface MoveToFolderDropdownProps {
  variant: VariantResult;
  jobId: string;
  originalName: string;
  userFolders: UserFolder[];
  assignedFolderIds: string[];
  onMoveToFolder: (folderId: string, ref: FolderFileRef) => void;
  onCreateFolder: (name: string) => string;
}

interface FlatFolder {
  id: string;
  name: string;
  depth: number;
  fileCount: number;
}

function flattenFolders(folders: UserFolder[], depth = 0): FlatFolder[] {
  return folders.flatMap((f) => [
    { id: f.id, name: f.name, depth, fileCount: f.files.length },
    ...flattenFolders(f.subfolders, depth + 1),
  ]);
}

export function MoveToFolderDropdown({
  variant,
  jobId,
  originalName,
  userFolders,
  assignedFolderIds,
  onMoveToFolder,
  onCreateFolder,
}: MoveToFolderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute dropdown position from button bounds
  const openDropdown = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = 224; // w-56 = 14rem = 224px
    // Align right edge of panel with right edge of button; clamp to viewport
    const left = Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8);
    setDropdownPos({ top: rect.bottom + 4, left: Math.max(8, left) });
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsCreating(false);
    setNewFolderName("");
  };

  // Close on click outside (covers both button and portal panel)
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) return;
      closeDropdown();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  // Close on scroll/resize so panel doesn't drift
  useEffect(() => {
    if (!isOpen) return;
    const close = () => closeDropdown();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isCreating && inputRef.current) inputRef.current.focus();
  }, [isCreating]);

  const buildRef = (): FolderFileRef => ({ jobId, originalName, variant });

  const handleSelectFolder = (folderId: string) => {
    if (assignedFolderIds.includes(folderId)) return;
    onMoveToFolder(folderId, buildRef());
    closeDropdown();
  };

  const handleCreateAndAssign = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const newId = onCreateFolder(trimmed);
    if (newId) onMoveToFolder(newId, buildRef());
    setNewFolderName("");
    setIsCreating(false);
    closeDropdown();
  };

  const isAssigned = assignedFolderIds.length > 0;
  const flatFolders = flattenFolders(userFolders);

  const panel = isOpen && dropdownPos ? (
    <div
      ref={panelRef}
      style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999, width: "224px" }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-600">Move to folder</p>
      </div>

      {/* Folder list */}
      <div className="max-h-48 overflow-y-auto">
        {flatFolders.length === 0 && !isCreating && (
          <p className="text-xs text-gray-400 px-3 py-2">No folders yet — create one below</p>
        )}
        {flatFolders.map((folder) => {
          const isInFolder = assignedFolderIds.includes(folder.id);
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => handleSelectFolder(folder.id)}
              className={`w-full text-left py-2 pr-3 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                isInFolder ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-700"
              }`}
              style={{ paddingLeft: `${folder.depth * 14 + 12}px` }}
            >
              {folder.depth > 0 && (
                <span className="flex-shrink-0 w-2 h-px bg-gray-300 -ml-1" />
              )}
              <svg
                className={`w-3.5 h-3.5 flex-shrink-0 ${isInFolder ? "text-blue-500" : "text-yellow-500"}`}
                fill="currentColor" viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="truncate flex-1">{folder.name}</span>
              {isInFolder ? (
                <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[10px] text-gray-400 flex-shrink-0">{folder.fileCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Create new folder */}
      <div className="border-t border-gray-100">
        {isCreating ? (
          <div className="px-3 py-2 flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateAndAssign();
                if (e.key === "Escape") { setIsCreating(false); setNewFolderName(""); }
              }}
              placeholder="Folder name"
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button" onClick={handleCreateAndAssign} disabled={!newFolderName.trim()}
              className="p-1 text-blue-600 hover:text-blue-800 disabled:text-gray-300 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              type="button" onClick={() => { setIsCreating(false); setNewFolderName(""); }}
              className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button" onClick={() => setIsCreating(true)}
            className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create new folder
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
          isAssigned
            ? "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
            : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700"
        }`}
        title="Move to folder"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {isAssigned && <span className="text-[10px]">{assignedFolderIds.length}</span>}
      </button>

      {createPortal(panel, document.body)}
    </>
  );
}
