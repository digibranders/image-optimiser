import { useState, useEffect, useCallback, useRef } from "react";
import { UploadZone } from "./components/UploadZone";
import { ProgressBar } from "./components/ProgressBar";
import { StatsBar } from "./components/StatsBar";
import { ResultsGrid } from "./components/ResultsGrid";
import { FolderTree } from "./components/FolderTree";
import { StagedImageCard } from "./components/StagedImageCard";
import type { StagedImage } from "./components/StagedImageCard";
import type { UserFolder, FolderFileRef } from "./types";
import { useUpload } from "./hooks/useUpload";
import { useJobPolling } from "./hooks/useJobPolling";

type AppState = "idle" | "staging" | "uploading" | "processing" | "complete" | "error";

let imageIdCounter = 0;

function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>(() => {
    try {
      const saved = localStorage.getItem("image-optimizer-folders");
      return saved ? (JSON.parse(saved) as UserFolder[]) : [];
    } catch {
      return [];
    }
  });
  const addMoreRef = useRef<HTMLInputElement>(null);

  // Persist folders to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("image-optimizer-folders", JSON.stringify(userFolders));
    } catch {
      // Ignore quota errors
    }
  }, [userFolders]);

  const { upload, uploadProgress, isUploading, error: uploadError } = useUpload();
  const { jobStatus, isPolling, error: pollError, startPolling, reset: resetPolling } = useJobPolling();

  // Load image dimensions from a File
  const loadImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Stage files (first upload or add-more)
  const stageFiles = useCallback(async (files: File[]) => {
    const newImages: StagedImage[] = [];

    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const dims = await loadImageDimensions(file);
      imageIdCounter++;
      newImages.push({
        id: `img-${imageIdCounter}`,
        file,
        preview,
        dimensions: dims.width > 0 ? dims : null,
        resolution: dims.width > 0 ? { width: dims.width, height: dims.height } : null,
      });
    }

    setStagedImages((prev) => [...prev, ...newImages]);
    setAppState("staging");
  }, [loadImageDimensions]);

  // Handle initial upload zone
  const handleFilesSelected = (files: File[]) => {
    stageFiles(files);
  };

  // Handle "Add more" file input
  const handleAddMore = () => {
    addMoreRef.current?.click();
  };

  const handleAddMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remaining = 20 - stagedImages.length;
      const filesToAdd = Array.from(files).slice(0, remaining);
      stageFiles(filesToAdd);
    }
    // Reset input so same file can be re-added
    e.target.value = "";
  };

  // Per-image resolution change
  const handleResolutionChange = (id: string, resolution: { width: number; height: number } | null) => {
    setStagedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, resolution } : img))
    );
  };

  // Remove a staged image
  const handleRemoveImage = (id: string) => {
    setStagedImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      if (updated.length === 0) {
        setAppState("idle");
      }
      return updated;
    });
  };

  // Set same resolution for all images that don't have one
  const handleApplyToAll = (resolution: { width: number; height: number }) => {
    setStagedImages((prev) =>
      prev.map((img) => (img.resolution ? img : { ...img, resolution }))
    );
  };

  // Optimize — send all files with their resolutions
  const handleOptimize = async () => {
    if (stagedImages.length === 0) return;

    // Build per-image resolution map
    const resolutionsMap: { [filename: string]: { width: number; height: number } } = {};
    for (const img of stagedImages) {
      if (img.resolution) {
        resolutionsMap[img.file.name] = img.resolution;
      }
    }

    try {
      setAppState("uploading");
      setErrorMessage(null);

      const files = stagedImages.map((img) => img.file);
      const response = await upload(files, resolutionsMap);
      setJobId(response.job_id);
      setAppState("processing");
      startPolling(response.job_id);
    } catch {
      setAppState("error");
      setErrorMessage(uploadError || "Upload failed");
    }
  };

  // Update state based on polling
  useEffect(() => {
    if (jobStatus?.status === "complete" && appState === "processing") {
      setAppState("complete");
    }
    if (jobStatus?.status === "error" && appState === "processing") {
      setAppState("error");
      setErrorMessage(jobStatus.error || "Processing failed");
    }
    if (pollError && appState === "processing") {
      setAppState("error");
      setErrorMessage(pollError);
    }
  }, [jobStatus, pollError, appState]);

  // ── Recursive folder tree helpers ──────────────────────────────────────────
  function updateFolderById(
    folders: UserFolder[],
    id: string,
    updater: (f: UserFolder) => UserFolder
  ): UserFolder[] {
    return folders.map((f) => {
      if (f.id === id) return updater(f);
      return { ...f, subfolders: updateFolderById(f.subfolders, id, updater) };
    });
  }

  function deleteFolderById(folders: UserFolder[], id: string): UserFolder[] {
    return folders
      .filter((f) => f.id !== id)
      .map((f) => ({ ...f, subfolders: deleteFolderById(f.subfolders, id) }));
  }

  function collectFolderIdsWithVariant(folders: UserFolder[], filename: string): string[] {
    return folders.flatMap((f) => [
      ...(f.files.some((file) => file.variant.filename === filename) ? [f.id] : []),
      ...collectFolderIdsWithVariant(f.subfolders, filename),
    ]);
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Folder management handlers
  const createFolder = useCallback((name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const id = crypto.randomUUID();
    setUserFolders((prev) => [...prev, { id, name: trimmed, files: [], subfolders: [] }]);
    return id;
  }, []);

  const createSubfolder = useCallback((parentId: string, name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const id = crypto.randomUUID();
    setUserFolders((prev) =>
      updateFolderById(prev, parentId, (f) => ({
        ...f,
        subfolders: [...f.subfolders, { id, name: trimmed, files: [], subfolders: [] }],
      }))
    );
    return id;
  }, []);

  const renameFolder = useCallback((folderId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setUserFolders((prev) =>
      updateFolderById(prev, folderId, (f) => ({ ...f, name: trimmed }))
    );
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setUserFolders((prev) => deleteFolderById(prev, folderId));
  }, []);

  const moveToFolder = useCallback((folderId: string, ref: FolderFileRef) => {
    setUserFolders((prev) =>
      updateFolderById(prev, folderId, (f) => {
        if (f.files.some((file) => file.variant.filename === ref.variant.filename)) return f;
        return { ...f, files: [...f.files, ref] };
      })
    );
  }, []);

  const removeFromFolder = useCallback((folderId: string, variantFilename: string) => {
    setUserFolders((prev) =>
      updateFolderById(prev, folderId, (f) => ({
        ...f,
        files: f.files.filter((file) => file.variant.filename !== variantFilename),
      }))
    );
  }, []);

  const getFoldersForVariant = useCallback(
    (variantFilename: string): string[] => collectFolderIdsWithVariant(userFolders, variantFilename),
    [userFolders]
  );

  const handleReset = () => {
    // Revoke all preview URLs
    stagedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setAppState("idle");
    setJobId(null);
    setErrorMessage(null);
    setStagedImages([]);
    setUserFolders([]);
    resetPolling();
  };

  const allHaveResolution = stagedImages.length > 0 && stagedImages.every((img) => img.resolution !== null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Image Optimizer</h1>
          </div>
          {appState !== "idle" && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Step 1: Initial upload */}
        {appState === "idle" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Optimize your images instantly
              </h2>
              <p className="text-gray-600 text-lg">
                Compress images and convert to AVIF, WebP, JPEG & PNG.
                Pick a resolution per image before optimizing.
              </p>
            </div>
            <UploadZone onFilesSelected={handleFilesSelected} isDisabled={false} />
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-2xl font-bold text-blue-600">AVIF</p>
                <p className="text-xs text-gray-500 mt-1">Best compression</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-2xl font-bold text-green-600">WebP</p>
                <p className="text-xs text-gray-500 mt-1">97% browser support</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-2xl font-bold text-purple-600">4 Formats</p>
                <p className="text-xs text-gray-500 mt-1">AVIF, WebP, JPEG, PNG</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Staging — per-image resolution + add more */}
        {appState === "staging" && (
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Set resolution per image
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {stagedImages.length} image{stagedImages.length !== 1 ? "s" : ""} staged
                  {stagedImages.length < 20 && " — you can add more"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Quick-apply dropdown */}
                {!allHaveResolution && (
                  <div className="relative group">
                    <button
                      className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                    >
                      Apply to all unset ▾
                    </button>
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => handleApplyToAll({ width: 1920, height: 1080 })}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer"
                      >
                        1920 × 1080
                      </button>
                      <button
                        onClick={() => handleApplyToAll({ width: 1200, height: 800 })}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer"
                      >
                        1200 × 800
                      </button>
                      <button
                        onClick={() => handleApplyToAll({ width: 300, height: 300 })}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer"
                      >
                        300 × 300
                      </button>
                    </div>
                  </div>
                )}

                {/* Add more button */}
                {stagedImages.length < 20 && (
                  <>
                    <button
                      onClick={handleAddMore}
                      className="px-4 py-2 text-sm font-medium bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add more
                    </button>
                    <input
                      ref={addMoreRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/tiff"
                      multiple
                      onChange={handleAddMoreChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Image cards */}
            <div className="space-y-3 mb-6">
              {stagedImages.map((img) => (
                <StagedImageCard
                  key={img.id}
                  image={img}
                  onResolutionChange={handleResolutionChange}
                  onRemove={handleRemoveImage}
                />
              ))}
            </div>

            {/* Status + Optimize button */}
            <div className="sticky bottom-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {allHaveResolution
                      ? `All ${stagedImages.length} images ready`
                      : `${stagedImages.filter((i) => i.resolution).length} of ${stagedImages.length} images configured`
                    }
                  </p>
                  {!allHaveResolution && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Set a resolution for each image to continue
                    </p>
                  )}
                </div>
                <button
                  onClick={handleOptimize}
                  disabled={!allHaveResolution}
                  className={`
                    px-6 py-3 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer
                    ${allHaveResolution
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Optimize {stagedImages.length} image{stagedImages.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uploading / Processing */}
        {(appState === "uploading" || appState === "processing") && (
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <ProgressBar
              uploadProgress={uploadProgress}
              processingProgress={jobStatus?.progress || 0}
              isUploading={isUploading}
              isProcessing={isPolling}
              totalFiles={stagedImages.length}
              processedFiles={jobStatus?.results?.length || 0}
            />
          </div>
        )}

        {/* Results */}
        {appState === "complete" && jobStatus && jobId && (
          <div className="space-y-6">
            <StatsBar
              jobId={jobId}
              totalOriginalSize={jobStatus.total_original_size}
              totalOptimizedSize={jobStatus.total_optimized_size}
              totalReductionPercent={jobStatus.total_reduction_percent}
              fileCount={jobStatus.results.length}
            />
            <div className="flex gap-6">
              <div className="flex-1 min-w-0">
                <ResultsGrid
                  results={jobStatus.results}
                  jobId={jobId}
                  userFolders={userFolders}
                  onCreateFolder={createFolder}
                  onMoveToFolder={moveToFolder}
                  getFoldersForVariant={getFoldersForVariant}
                />
              </div>
              <div className="w-72 flex-shrink-0 hidden lg:block">
                <div className="sticky top-6">
                  <FolderTree
                    results={jobStatus.results}
                    jobId={jobId}
                    userFolders={userFolders}
                    onCreateFolder={createFolder}
                    onCreateSubfolder={createSubfolder}
                    onRenameFolder={renameFolder}
                    onDeleteFolder={deleteFolder}
                    onRemoveFromFolder={removeFromFolder}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {appState === "error" && (
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-sm text-gray-500">
          Image Optimizer — AVIF, WebP & optimized formats. No data stored permanently.
        </div>
      </footer>
    </div>
  );
}

export default App;
