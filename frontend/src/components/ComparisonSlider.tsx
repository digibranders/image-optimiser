import { useState, useRef, useCallback, useEffect } from "react";

interface ComparisonSliderProps {
  originalUrl: string;
  optimizedUrl: string;
  originalName: string;
  originalSize: string;
  optimizedSize: string;
  reductionPercent: number;
  format: string;
}

export function ComparisonSlider({
  originalUrl,
  optimizedUrl,
  originalName,
  originalSize,
  optimizedSize,
  reductionPercent,
  format,
}: ComparisonSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percent);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX);
    },
    [handleMove]
  );

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div className="space-y-3">
      {/* Stats strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Original</span>
          <span className="text-xs font-bold text-gray-900">{originalSize}</span>
        </div>
        <div className="px-3 py-1 bg-green-100 rounded-full">
          <span className="text-xs font-bold text-green-700">-{reductionPercent}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-900">{optimizedSize}</span>
          <span className="text-xs font-medium text-gray-500">{format.toUpperCase()}</span>
        </div>
      </div>

      {/* Slider container */}
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-950">
        <div
          ref={containerRef}
          className="relative w-full aspect-video cursor-col-resize select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onClick={(e) => handleMove(e.clientX)}
        >
          {/* Bottom layer: Optimized image (revealed as slider moves right) */}
          <img
            src={optimizedUrl}
            alt={`Optimized ${originalName}`}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

          {/* Top layer: Original image clipped from the right by slider position */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <img
              src={originalUrl}
              alt={`Original ${originalName}`}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          </div>

          {/* Slider divider line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white/80 z-10"
            style={{ left: `${position}%`, transform: "translateX(-1px)" }}
          >
            {/* Drag handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <svg className="w-5 h-5 text-gray-500 -ml-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
