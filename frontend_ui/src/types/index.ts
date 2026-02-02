export interface NGramModel {
  [context: string]: {
    [nextChord: string]: number;
  };
}

export interface Models {
  unigram: NGramModel;
  bigram: NGramModel;
  trigram: NGramModel;
}

export interface InterpolationWeights {
  lambda3: number; // Trigram weight
  lambda2: number; // Bigram weight
  lambda1: number; // Unigram weight
}

export interface AppState {
  currentProgression: string[];
  probabilities: Models;
  interpolationWeights: InterpolationWeights;
  nextChordProbabilities: Record<string, number>;
}

export interface SavedProgression {
  id: string;
  chords: string[];
  timestamp: number;
}

