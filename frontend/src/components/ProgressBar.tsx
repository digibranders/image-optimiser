import { useState, useEffect, useRef } from "react";

interface ProgressBarProps {
  uploadProgress: number;
  processingProgress: number;
  isUploading: boolean;
  isProcessing: boolean;
  totalFiles: number;
  processedFiles: number;
}

export function ProgressBar({
  uploadProgress,
  processingProgress,
  isUploading,
  isProcessing,
  totalFiles,
  processedFiles,
}: ProgressBarProps) {
  const [smoothProgress, setSmoothProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const targetRef = useRef(0);

  // Calculate the real target progress
  useEffect(() => {
    if (isUploading) {
      // Upload phase: 0-40% of the bar
      targetRef.current = Math.min(uploadProgress * 0.4, 40);
    } else if (isProcessing) {
      // Processing phase: 40-95% (leave 5% for the final "completing" feel)
      const processingPortion = processingProgress * 0.55;
      targetRef.current = 40 + processingPortion;
    } else if (processingProgress >= 100) {
      targetRef.current = 100;
    }
  }, [uploadProgress, processingProgress, isUploading, isProcessing]);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setSmoothProgress((prev) => {
        const target = targetRef.current;
        const diff = target - prev;

        if (Math.abs(diff) < 0.5) return target;

        // Ease towards target — faster when far, slower when close
        const speed = Math.max(0.3, Math.abs(diff) * 0.08);
        return prev + (diff > 0 ? speed : -speed);
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const progress = Math.min(smoothProgress, 100);

  const getLabel = () => {
    if (isUploading) return "Uploading images...";
    if (isProcessing && totalFiles > 0) {
      return `Optimizing ${processedFiles}/${totalFiles} images...`;
    }
    if (isProcessing) return "Optimizing images...";
    return "Complete!";
  };

  const getSubtext = () => {
    if (isUploading) return "Sending files to the optimizer";
    if (isProcessing) return "Converting to AVIF, WebP, JPEG & PNG";
    return "";
  };

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{getLabel()}</span>
        <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 relative"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect while processing */}
          {(isUploading || isProcessing) && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">{getSubtext()}</p>
    </div>
  );
}
