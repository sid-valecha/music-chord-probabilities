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
  maxDisplay = 20,
}: ProbabilityBubblesProps) {
  // Sort chords by probability and take top N
  const sortedChords = useMemo(() => {
    return Object.entries(probabilities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxDisplay);
  }, [probabilities, maxDisplay]);

  if (sortedChords.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No probabilities available. Select chords to see next chord predictions.</p>
      </div>
    );
  }

  // Find max probability for scaling
  const maxProb = sortedChords[0]?.[1] || 1;

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Next Chord Probabilities</h2>
      <div className="flex flex-wrap gap-4 items-end justify-center">
        {sortedChords.map(([chord, prob]) => {
          // Scale bubble size (min 40px, max 120px)
          const size = 40 + (prob / maxProb) * 80;
          const opacity = 0.6 + (prob / maxProb) * 0.4;

          return (
            <div
              key={chord}
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => onChordClick(chord)}
            >
              <div
                className="rounded-full bg-blue-500 text-white font-semibold flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity,
                }}
                title={`${chord}: ${(prob * 100).toFixed(1)}%`}
              >
                <span className="text-sm">{chord}</span>
              </div>
              <span className="text-xs text-gray-600 mt-1">
                {(prob * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      {Object.keys(probabilities).length > maxDisplay && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Showing top {maxDisplay} of {Object.keys(probabilities).length} chords
        </p>
      )}
    </div>
  );
}

