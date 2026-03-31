import type { ImageResult } from "../types";
import { ImageCard } from "./ImageCard";

interface ResultsGridProps {
  results: ImageResult[];
  jobId: string;
}

export function ResultsGrid({ results, jobId }: ResultsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {results.map((result, index) => (
        <ImageCard key={`${result.original_name}-${index}`} result={result} jobId={jobId} />
      ))}
    </div>
  );
}
