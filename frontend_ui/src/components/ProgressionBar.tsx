'use client';

import React from 'react';
import { formatChordDisplay } from '@/lib/chordFormat';

interface ProgressionBarProps {
  progression: string[];
  onChordClick?: (index: number) => void;
  onClear?: () => void;
  onSave?: () => void;
  onDownloadMidi?: () => void;
  onPlayMidi?: () => void;
  onStopMidi?: () => void;
  isPlaying?: boolean;
}

export default function ProgressionBar({
  progression,
  onChordClick,
  onClear,
  onSave,
  onDownloadMidi,
  onPlayMidi,
  onStopMidi,
  isPlaying = false,
}: ProgressionBarProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[1fr_auto] gap-y-3 items-center sm:grid-cols-[1fr_auto_auto] sm:gap-y-0 mb-4">
        <div className="col-start-1 row-start-1">
          <h2 className="text-lg font-semibold text-gray-900">Current Progression</h2>
          <p className="text-sm text-gray-500">Click a chord to remove it</p>
        </div>
        {progression.length > 0 && (
          <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:row-start-1 sm:col-start-2 sm:justify-self-end">
            {onPlayMidi && (
              <button
                onClick={isPlaying ? onStopMidi : onPlayMidi}
                className="btn-secondary flex items-center gap-1.5 whitespace-nowrap"
                disabled={isPlaying && !onStopMidi}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isPlaying ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v18l15-9L5 3z" />
                  )}
                </svg>
                {isPlaying ? 'Stop' : 'Play'}
              </button>
            )}
            {onDownloadMidi && (
              <button onClick={onDownloadMidi} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download MIDI
              </button>
            )}
            {onSave && (
              <button onClick={onSave} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
            )}
          </div>
        )}
        {progression.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="btn-danger flex items-center gap-1.5 whitespace-nowrap col-start-2 row-start-1 justify-self-end sm:col-start-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        )}
      </div>
      <div className="min-h-[3.5rem] p-4 rounded-lg bg-gray-50 border border-gray-200">
        {progression.length === 0 ? (
          <p className="text-gray-400 text-center text-sm">
            No chords selected yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {progression.map((chord, index) => (
              <button
                key={`${chord}-${index}`}
                onClick={() => onChordClick?.(index)}
                className="chord-chip group relative"
              >
                {formatChordDisplay(chord)}
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
