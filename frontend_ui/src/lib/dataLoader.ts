import { Models } from '@/types';

let cachedModels: Models | null = null;

// basePath must match next.config.js
const basePath = '/chord-probabilities';

export interface LoadProgress {
  loaded: number;
  total: number;
  currentFile: string;
}

export async function loadModels(
  onProgress?: (progress: LoadProgress) => void
): Promise<Models> {
  if (cachedModels) {
    return cachedModels;
  }

  const files = [
    { name: 'unigram.json', key: 'unigram' },
    { name: 'bigram.json', key: 'bigram' },
    { name: 'trigram.json', key: 'trigram' },
  ];

  const results: Record<string, unknown> = {};

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      onProgress?.({
        loaded: i,
        total: files.length,
        currentFile: file.name,
      });

      const response = await fetch(`${basePath}/data/${file.name}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${file.name}: ${response.status}`);
      }
      results[file.key] = await response.json();
    }

    onProgress?.({
      loaded: files.length,
      total: files.length,
      currentFile: 'Complete',
    });

    cachedModels = {
      unigram: results.unigram as Models['unigram'],
      bigram: results.bigram as Models['bigram'],
      trigram: results.trigram as Models['trigram'],
    };

    return cachedModels;
  } catch (error) {
    console.error('Error loading models:', error);
    throw new Error('Failed to load probability models');
  }
}
