import { Models, InterpolationWeights } from '@/types';

const DEFAULT_WEIGHTS: InterpolationWeights = {
  lambda3: 0.60, // Trigram
  lambda2: 0.30, // Bigram
  lambda1: 0.10, // Unigram
};

const BACKOFF_THRESHOLD = 3;

interface ContextCounts {
  unigram?: number;
  bigram?: number;
  trigram?: number;
}

/**
 * Get context counts from metadata (if available) for backoff threshold checking
 */
function getContextCounts(
  progression: string[],
  metadata?: any
): ContextCounts {
  const counts: ContextCounts = {};

  if (metadata) {
    // Unigram context (last chord)
    if (progression.length >= 1) {
      const context = progression[progression.length - 1];
      counts.unigram = metadata.unigram_counts?.[context] || 0;
    }

    // Bigram context (last 2 chords)
    if (progression.length >= 2) {
      const context = progression.slice(-2).join(',');
      counts.bigram = metadata.bigram_counts?.[context] || 0;
    }

    // Trigram context (last 3 chords)
    if (progression.length >= 3) {
      const context = progression.slice(-3).join(',');
      counts.trigram = metadata.trigram_counts?.[context] || 0;
    }
  }

  return counts;
}

/**
 * Adjust interpolation weights based on context strength (soft backoff)
 */
function adjustWeights(
  weights: InterpolationWeights,
  contextCounts: ContextCounts
): InterpolationWeights {
  let lambda3 = weights.lambda3;
  let lambda2 = weights.lambda2;
  let lambda1 = weights.lambda1;

  // If trigram context is weak or missing, reduce its weight
  if (contextCounts.trigram === undefined || contextCounts.trigram < BACKOFF_THRESHOLD) {
    // Reduce trigram weight, redistribute to bigram and unigram
    const reduction = lambda3 * 0.5; // Reduce by 50%
    lambda3 = lambda3 - reduction;
    lambda2 = lambda2 + reduction * 0.6; // 60% to bigram
    lambda1 = lambda1 + reduction * 0.4; // 40% to unigram
  }

  // If bigram context is weak or missing, reduce its weight
  if (contextCounts.bigram === undefined || contextCounts.bigram < BACKOFF_THRESHOLD) {
    const reduction = lambda2 * 0.5;
    lambda2 = lambda2 - reduction;
    lambda1 = lambda1 + reduction; // All to unigram
  }

  // Normalize to ensure sum = 1.0
  const total = lambda1 + lambda2 + lambda3;
  if (total > 0) {
    lambda1 = lambda1 / total;
    lambda2 = lambda2 / total;
    lambda3 = lambda3 / total;
  }

  return { lambda1, lambda2, lambda3 };
}

/**
 * Get probabilities from a specific model for a given context
 */
function getModelProbabilities(
  model: Models['unigram'] | Models['bigram'] | Models['trigram'],
  context: string
): Record<string, number> {
  return model[context] || {};
}

/**
 * Compute interpolated probabilities for next chords given a progression
 */
export function computeProbabilities(
  progression: string[],
  models: Models,
  weights: InterpolationWeights = DEFAULT_WEIGHTS,
  metadata?: any
): Record<string, number> {
  if (progression.length === 0) {
    return {};
  }

  // Get context counts for backoff adjustment
  const contextCounts = getContextCounts(progression, metadata);

  // Adjust weights based on context strength
  const adjustedWeights = adjustWeights(weights, contextCounts);

  // Collect all possible next chords from all models
  const allNextChords = new Set<string>();

  // Get probabilities from each model
  let trigramProbs: Record<string, number> = {};
  let bigramProbs: Record<string, number> = {};
  let unigramProbs: Record<string, number> = {};

  // Trigram: P(next | last 3 chords)
  if (progression.length >= 3 && contextCounts.trigram !== undefined && contextCounts.trigram >= BACKOFF_THRESHOLD) {
    const context = progression.slice(-3).join(',');
    trigramProbs = getModelProbabilities(models.trigram, context);
    Object.keys(trigramProbs).forEach(chord => allNextChords.add(chord));
  }

  // Bigram: P(next | last 2 chords)
  if (progression.length >= 2 && contextCounts.bigram !== undefined && contextCounts.bigram >= BACKOFF_THRESHOLD) {
    const context = progression.slice(-2).join(',');
    bigramProbs = getModelProbabilities(models.bigram, context);
    Object.keys(bigramProbs).forEach(chord => allNextChords.add(chord));
  }

  // Unigram: P(next | last chord)
  if (progression.length >= 1) {
    const context = progression[progression.length - 1];
    unigramProbs = getModelProbabilities(models.unigram, context);
    Object.keys(unigramProbs).forEach(chord => allNextChords.add(chord));
  }

  // If no probabilities found, return empty
  if (allNextChords.size === 0) {
    return {};
  }

  // Compute interpolated probabilities
  const finalProbs: Record<string, number> = {};

  for (const chord of allNextChords) {
    const p3 = trigramProbs[chord] || 0;
    const p2 = bigramProbs[chord] || 0;
    const p1 = unigramProbs[chord] || 0;

    const interpolated =
      adjustedWeights.lambda3 * p3 +
      adjustedWeights.lambda2 * p2 +
      adjustedWeights.lambda1 * p1;

    if (interpolated > 0) {
      finalProbs[chord] = interpolated;
    }
  }

  // Normalize to ensure probabilities sum to 1.0
  const total = Object.values(finalProbs).reduce((sum, p) => sum + p, 0);
  if (total > 0) {
    for (const chord in finalProbs) {
      finalProbs[chord] = finalProbs[chord] / total;
    }
  }

  return finalProbs;
}

