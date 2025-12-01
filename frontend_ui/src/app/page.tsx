'use client';

import React, { useState, useEffect } from 'react';
import { Models, InterpolationWeights } from '@/types';
import { loadModels } from '@/lib/dataLoader';
import { computeProbabilities } from '@/lib/probability';
import ProgressionBar from '@/components/ProgressionBar';
import ProbabilityBubbles from '@/components/ProbabilityBubbles';

const DEFAULT_WEIGHTS: InterpolationWeights = {
  lambda3: 0.60,
  lambda2: 0.30,
  lambda1: 0.10,
};

export default function Home() {
  const [models, setModels] = useState<Models | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progression, setProgression] = useState<string[]>([]);
  const [nextChordProbs, setNextChordProbs] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load models on mount
    loadModels()
      .then(setModels)
      .catch((err) => {
        console.error('Failed to load models:', err);
        setError('Failed to load probability models. Please ensure the JSON files are in /public/data/');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Update probabilities when progression changes
    if (models && progression.length > 0) {
      const probs = computeProbabilities(progression, models, DEFAULT_WEIGHTS);
      setNextChordProbs(probs);
    } else {
      setNextChordProbs({});
    }
  }, [progression, models]);

  const handleChordClick = (chord: string) => {
    setProgression([...progression, chord]);
  };

  const handleRemoveChord = (index: number) => {
    setProgression(progression.filter((_: string, i: number) => i !== index));
  };

  const handleClear = () => {
    setProgression([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading probability models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <h1 className="text-xl font-bold text-red-800 mb-2">Error</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Chord Probability Explorer
          </h1>
          <p className="text-gray-600">
            Explore chord progression probabilities using N-gram models
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <ProgressionBar
            progression={progression}
            onChordClick={handleRemoveChord}
            onClear={handleClear}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {progression.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Start by clicking a chord below to build a progression.
              </p>
              {models && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {Object.keys(models.unigram)
                    .slice(0, 20)
                    .map((chord) => (
                      <button
                        key={chord}
                        onClick={() => handleChordClick(chord)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                      >
                        {chord}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <ProbabilityBubbles
              probabilities={nextChordProbs}
              onChordClick={handleChordClick}
              maxDisplay={20}
            />
          )}
        </div>

        {models && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Models loaded: {Object.keys(models.unigram).length} unigram contexts,{' '}
              {Object.keys(models.bigram).length} bigram contexts,{' '}
              {Object.keys(models.trigram).length} trigram contexts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

