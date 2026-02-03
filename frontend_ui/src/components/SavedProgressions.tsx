'use client';

import React, { useState } from 'react';
import { SavedProgression } from '@/types';
import { formatChordDisplay } from '@/lib/chordFormat';
import { buildMidiFile, makeMidiFilename, playChordProgression } from '@/lib/midi';

interface SavedProgressionsProps {
  progressions: SavedProgression[];
  onRemove: (id: string) => void;
}

function sanitizeCsvCell(value: string | number): string {
  const text = String(value);
  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }
  return text;
}

function exportToCSV(progressions: SavedProgression[]) {
  if (progressions.length === 0) return;

  const headers = ['#', 'Chords', 'Length', 'Timestamp'];
  const rows = progressions.map((p, index) => [
    progressions.length - index,
    p.chords.map(formatChordDisplay).join(' → '),
    p.chords.length,
    new Date(p.timestamp).toISOString(),
  ]);

  const csvContent = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map(row => row.map(cell => `"${sanitizeCsvCell(cell)}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chord-progressions-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SavedProgressions({
  progressions,
  onRemove,
}: SavedProgressionsProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleDownloadMidi = (chords: string[]) => {
    if (chords.length === 0) return;
    const midiBytes = buildMidiFile(chords);
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = makeMidiFilename(chords);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePlayMidi = async (id: string, chords: string[]) => {
    if (chords.length === 0 || playingId) return;
    setPlayingId(id);
    try {
      const duration = await playChordProgression(chords);
      window.setTimeout(() => setPlayingId(null), duration * 1000);
    } catch (err) {
      console.error('Failed to play progression:', err);
      setPlayingId(null);
    }
  };

  if (progressions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No saved progressions</h3>
        <p className="text-sm text-gray-500">Save a progression to see it here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Saved Progressions</h2>
          <p className="text-sm text-gray-500">{progressions.length} saved</p>
        </div>
        <button
          onClick={() => exportToCSV(progressions)}
          className="btn-secondary flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>
      <div className="space-y-3">
        {progressions.map((progression, index) => (
          <div
            key={progression.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xs text-gray-400 font-medium">
                #{progressions.length - index}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {progression.chords.map((chord, chordIndex) => (
                  <span
                    key={`${chord}-${chordIndex}`}
                    className="px-2 py-1 text-xs font-medium rounded bg-brand-100 text-brand-700"
                  >
                    {formatChordDisplay(chord)}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-3">
              <button
                onClick={() => handlePlayMidi(progression.id, progression.chords)}
                className="p-1.5 rounded text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Play MIDI"
                disabled={playingId === progression.id}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v18l15-9L5 3z" />
                </svg>
              </button>
              <button
                onClick={() => handleDownloadMidi(progression.chords)}
                className="p-1.5 rounded text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Download MIDI"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => onRemove(progression.id)}
                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove progression"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
