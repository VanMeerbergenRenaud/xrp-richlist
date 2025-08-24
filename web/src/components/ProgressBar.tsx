import React from "react";

type ProgressBarHeight = "sm" | "md" | "lg";

interface ProgressBarProps {
  value: number; // 0..100
  height?: ProgressBarHeight;
  showLabels?: boolean;
  className?: string;
}

const heightMap: Record<ProgressBarHeight, string> = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

export default function ProgressBar({
  value,
  height = "sm",
  showLabels = true,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, isFinite(value) ? value : 0));
  return (
    <div className={className}>
      <div className={`w-full bg-gray-800 rounded overflow-hidden`} aria-label="progress">
        <div
          className={`${heightMap[height]} bg-cyan-500`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>0 %</span>
          <span>{clamped.toFixed(2)} %</span>
          <span>100 %</span>
        </div>
      )}
    </div>
  );
}
