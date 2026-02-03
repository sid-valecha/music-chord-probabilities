'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Models, InterpolationWeights, SavedProgression } from '@/types';
import { loadModels, LoadProgress } from '@/lib/dataLoader';
import { computeProbabilities } from '@/lib/probability';
import ProgressionBar from '@/components/ProgressionBar';
import ProbabilityBubbles from '@/components/ProbabilityBubbles';
import SavedProgressions from '@/components/SavedProgressions';
import { buildMidiFile, makeMidiFilename, onPlaybackStopped, playChordProgression, stopChordProgression } from '@/lib/midi';
import { formatChordDisplay } from '@/lib/chordFormat';

const DEFAULT_WEIGHTS: InterpolationWeights = {
  lambda3: 0.60,
  lambda2: 0.30,
  lambda1: 0.10,
};

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function Home() {
  const [models, setModels] = useState<Models | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ loaded: 0, total: 3, currentFile: '' });
  const [progression, setProgression] = useState<string[]>([]);
  const [nextChordProbs, setNextChordProbs] = useState<Record<string, number>>({});
  const [savedProgressions, setSavedProgressions] = useState<SavedProgression[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadModels((progress) => setLoadProgress(progress))
      .then(setModels)
      .catch((err) => {
        console.error('Failed to load models:', err);
        setError('Failed to load probability models. Please ensure the JSON files are in /public/data/');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (models && progression.length > 0) {
      const probs = computeProbabilities(progression, models, DEFAULT_WEIGHTS);
      setNextChordProbs(probs);
    } else {
      setNextChordProbs({});
    }
  }, [progression, models]);

  useEffect(() => {
    const unsubscribe = onPlaybackStopped(() => {
      if (playTimeoutRef.current) {
        window.clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      setIsPlaying(false);
    });
    return unsubscribe;
  }, []);

  const handleChordClick = (chord: string) => {
    setProgression([...progression, chord]);
  };

  const handleRemoveChord = (index: number) => {
    setProgression(progression.filter((_: string, i: number) => i !== index));
  };

  const handleClear = () => {
    setProgression([]);
  };

  const handleSaveProgression = () => {
    if (progression.length === 0) return;

    const newProgression: SavedProgression = {
      id: generateId(),
      chords: [...progression],
      timestamp: Date.now(),
    };

    setSavedProgressions([newProgression, ...savedProgressions]);
  };

  const handleRemoveSavedProgression = (id: string) => {
    setSavedProgressions(savedProgressions.filter((p) => p.id !== id));
  };

  const handleDownloadMidi = () => {
    if (progression.length === 0) return;
    const midiBytes = buildMidiFile(progression);
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = makeMidiFilename(progression);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePlayMidi = async () => {
    if (progression.length === 0 || isPlaying) return;
    try {
      await stopChordProgression();
      setIsPlaying(true);
      const duration = await playChordProgression(progression);
      if (playTimeoutRef.current) {
        window.clearTimeout(playTimeoutRef.current);
      }
      playTimeoutRef.current = window.setTimeout(() => setIsPlaying(false), duration * 1000);
    } catch (err) {
      console.error('Failed to play progression:', err);
      setIsPlaying(false);
    }
  };

  const handleStopMidi = async () => {
    if (!isPlaying) return;
    if (playTimeoutRef.current) {
      window.clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    await stopChordProgression();
    setIsPlaying(false);
  };

  if (loading) {
    const progressPercent = (loadProgress.loaded / loadProgress.total) * 100;

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in w-full max-w-sm px-6">
          <div className="w-12 h-12 mx-auto mb-6 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Loading Models
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {loadProgress.currentFile ? `Loading ${loadProgress.currentFile}...` : 'Preparing...'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {loadProgress.loaded} of {loadProgress.total}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md p-6 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h1>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="mb-6 flex items-center justify-start">
          <a
            href="https://sidvalecha.com"
            className="btn-secondary flex items-center gap-2 text-sm"
            aria-label="Back to home page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home page
          </a>
        </nav>

        {/* Header */}
        <header className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chord Probability Explorer
          </h1>
          <p className="text-gray-600">
            Build progressions with AI predictions trained on real songs
          </p>
        </header>

        {/* Current Progression */}
        <section className="card p-6 mb-6 animate-fade-in-up">
          <ProgressionBar
            progression={progression}
            onChordClick={handleRemoveChord}
            onClear={handleClear}
            onSave={handleSaveProgression}
            onDownloadMidi={handleDownloadMidi}
            onPlayMidi={handlePlayMidi}
            onStopMidi={handleStopMidi}
            isPlaying={isPlaying}
          />
        </section>

        {/* Chord Selection / Predictions */}
        <section className="card p-6 mb-6 animate-fade-in-up">
          {progression.length === 0 ? (
            <div className="text-center py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Start Building
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Click a chord to begin your progression
              </p>
              {models && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {Object.keys(models.unigram)
                    .slice(0, 16)
                    .map((chord) => (
                      <button
                        key={chord}
                        onClick={() => handleChordClick(chord)}
                        className="chord-chip-outline"
                      >
                        {formatChordDisplay(chord)}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <ProbabilityBubbles
              probabilities={nextChordProbs}
              onChordClick={handleChordClick}
              maxDisplay={16}
            />
          )}
        </section>

        {/* Saved Progressions */}
        <section className="card p-6 animate-fade-in-up">
          <SavedProgressions
            progressions={savedProgressions}
            onRemove={handleRemoveSavedProgression}
          />
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          {models && (
            <p className="mb-4">
              {Object.keys(models.unigram).length.toLocaleString()} chords · {Object.keys(models.bigram).length.toLocaleString()} bigrams · {Object.keys(models.trigram).length.toLocaleString()} trigrams
            </p>
          )}
          <p>© Sid Valecha 2026</p>
        </footer>
      </div>
    </div>
  );
}
