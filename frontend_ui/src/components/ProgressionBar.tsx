'use client';

import React from 'react';

interface ProgressionBarProps {
  progression: string[];
  onChordClick?: (index: number) => void;
  onClear?: () => void;
}

export default function ProgressionBar({
  progression,
  onChordClick,
  onClear,
}: ProgressionBarProps) {
  return (
    <div className="w-full bg-gray-100 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800">Current Progression</h2>
        {progression.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {progression.length === 0 ? (
          <p className="text-gray-500 italic">No chords selected. Click a chord below to start.</p>
        ) : (
          progression.map((chord, index) => (
            <button
              key={`${chord}-${index}`}
              onClick={() => onChordClick?.(index)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-lg"
            >
              {chord}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

