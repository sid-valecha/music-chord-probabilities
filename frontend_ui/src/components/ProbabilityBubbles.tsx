'use client';

import React, { useMemo } from 'react';

interface ProbabilityBubblesProps {
  probabilities: Record<string, number>;
  onChordClick: (chord: string) => void;
  maxDisplay?: number;
}

export default function ProbabilityBubbles({
  probabilities,
  onChordClick,
  maxDisplay = 16,
}: ProbabilityBubblesProps) {
  const sortedChords = useMemo(() => {
    return Object.entries(probabilities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxDisplay);
  }, [probabilities, maxDisplay]);

  if (sortedChords.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          Select chords to see predictions
        </p>
      </div>
    );
  }

  const maxProb = sortedChords[0]?.[1] || 1;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Next Chord Predictions</h2>
          <p className="text-sm text-gray-500">Click to add to your progression</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center items-center py-4">
        {sortedChords.map(([chord, prob]) => {
          const normalizedProb = prob / maxProb;
          const size = 40 + normalizedProb * 70;

          return (
            <button
              key={chord}
              onClick={() => onChordClick(chord)}
              className="flex flex-col items-center group"
            >
              <div
                className="rounded-full flex items-center justify-center font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  fontSize: `${Math.max(12, size / 4)}px`,
                }}
              >
                {chord}
              </div>
              <span className="text-xs text-gray-500 mt-1.5 group-hover:text-brand-600 transition-colors">
                {(prob * 100).toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>

      {Object.keys(probabilities).length > maxDisplay && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Showing top {maxDisplay} of {Object.keys(probabilities).length}
        </p>
      )}
    </div>
  );
}
