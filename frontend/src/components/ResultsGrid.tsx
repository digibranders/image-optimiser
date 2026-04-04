import type { ImageResult, UserFolder, FolderFileRef } from "../types";
import { ImageCard } from "./ImageCard";

interface ResultsGridProps {
  results: ImageResult[];
  jobId: string;
  userFolders: UserFolder[];
  onCreateFolder: (name: string) => string;
  onMoveToFolder: (folderId: string, ref: FolderFileRef) => void;
  getFoldersForVariant: (variantFilename: string) => string[];
}

export function ResultsGrid({ results, jobId, userFolders, onCreateFolder, onMoveToFolder, getFoldersForVariant }: ResultsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {results.map((result, index) => (
        <ImageCard
          key={`${result.original_name}-${index}`}
          result={result}
          jobId={jobId}
          userFolders={userFolders}
          onCreateFolder={onCreateFolder}
          onMoveToFolder={onMoveToFolder}
          getFoldersForVariant={getFoldersForVariant}
        />
      ))}
    </div>
  );
}
