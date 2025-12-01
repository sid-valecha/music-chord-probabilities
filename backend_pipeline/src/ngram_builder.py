"""Build unigram, bigram, and trigram models with incremental counting."""

from collections import defaultdict, Counter
from typing import List, Dict, Tuple, Optional, Callable


class NGramBuilder:
    """Builds n-gram models with memory-efficient incremental counting."""
    
    def __init__(self):
        """Initialize empty counters for unigram, bigram, and trigram models."""
        # Counters: context -> {next_chord: count}
        self.unigram_counts = Counter()  # Single chord -> {next_chord: count}
        self.bigram_counts = defaultdict(Counter)  # "C,G" -> {next_chord: count}
        self.trigram_counts = defaultdict(Counter)  # "C,G,Amin" -> {next_chord: count}
        
        # Also track context counts for backoff threshold checking
        self.unigram_context_counts = Counter()  # Single chord -> total count
        self.bigram_context_counts = Counter()  # "C,G" -> total count
        self.trigram_context_counts = Counter()  # "C,G,Amin" -> total count
        
        self._normalized = False
    
    def update_counts(self, chord_sequence: List[str], progress_callback: Optional[Callable] = None):
        """Update n-gram counts from a chord sequence.
        
        Processes one song at a time, updating counts incrementally.
        Does not store the full sequence - only updates counts.
        
        Args:
            chord_sequence: List of normalized chord strings
            progress_callback: Optional callback function for progress updates
        """
        if not chord_sequence or len(chord_sequence) < 1:
            return
        
        # Unigram (first-order Markov): P(next | current)
        for i in range(len(chord_sequence) - 1):
            current = chord_sequence[i]
            next_chord = chord_sequence[i + 1]
            self.unigram_counts[(current, next_chord)] += 1
            self.unigram_context_counts[current] += 1
        
        # Bigram: P(next | last 2 chords)
        for i in range(len(chord_sequence) - 2):
            context = (chord_sequence[i], chord_sequence[i + 1])
            next_chord = chord_sequence[i + 2]
            context_key = ",".join(context)
            self.bigram_counts[context_key][next_chord] += 1
            self.bigram_context_counts[context_key] += 1
        
        # Trigram: P(next | last 3 chords)
        for i in range(len(chord_sequence) - 3):
            context = (chord_sequence[i], chord_sequence[i + 1], chord_sequence[i + 2])
            next_chord = chord_sequence[i + 3]
            context_key = ",".join(context)
            self.trigram_counts[context_key][next_chord] += 1
            self.trigram_context_counts[context_key] += 1
        
        if progress_callback:
            progress_callback()
    
    def normalize(self):
        """Convert counts to probabilities.
        
        Normalizes each context's counts to sum to 1.0 (probability distribution).
        """
        if self._normalized:
            return
        
        # Normalize unigram
        self.unigram_probs = defaultdict(dict)
        for (context, next_chord), count in self.unigram_counts.items():
            total = self.unigram_context_counts[context]
            if total > 0:
                prob = count / total
                if context not in self.unigram_probs:
                    self.unigram_probs[context] = {}
                self.unigram_probs[context][next_chord] = prob
        
        # Normalize bigram
        self.bigram_probs = {}
        for context_key, next_chord_counts in self.bigram_counts.items():
            total = self.bigram_context_counts[context_key]
            if total > 0:
                self.bigram_probs[context_key] = {
                    next_chord: count / total
                    for next_chord, count in next_chord_counts.items()
                }
        
        # Normalize trigram
        self.trigram_probs = {}
        for context_key, next_chord_counts in self.trigram_counts.items():
            total = self.trigram_context_counts[context_key]
            if total > 0:
                self.trigram_probs[context_key] = {
                    next_chord: count / total
                    for next_chord, count in next_chord_counts.items()
                }
        
        self._normalized = True
    
    def apply_smoothing(self, alpha: float = 1.0):
        """Apply add-one (Laplace) smoothing to handle unseen transitions.
        
        Adds alpha (default 1.0) to each count before normalization.
        This ensures all possible transitions have non-zero probability.
        
        Args:
            alpha: Smoothing parameter (default 1.0 for add-one smoothing)
        """
        if not self._normalized:
            self.normalize()
        
        # Collect all unique chords (vocabulary)
        all_chords = set()
        for context in self.unigram_probs:
            all_chords.add(context)
            all_chords.update(self.unigram_probs[context].keys())
        for context_key in self.bigram_probs:
            all_chords.update(self.bigram_probs[context_key].keys())
        for context_key in self.trigram_probs:
            all_chords.update(self.trigram_probs[context_key].keys())
        
        vocab_size = len(all_chords)
        
        # Apply smoothing to unigram
        self.unigram_probs_smooth = {}
        for context in self.unigram_probs:
            smoothed_probs = {}
            context_total = self.unigram_context_counts[context]
            
            for chord in all_chords:
                original_count = self.unigram_counts.get((context, chord), 0)
                smoothed_count = original_count + alpha
                smoothed_probs[chord] = smoothed_count / (context_total + alpha * vocab_size)
            
            self.unigram_probs_smooth[context] = smoothed_probs
        
        # Apply smoothing to bigram
        self.bigram_probs_smooth = {}
        for context_key in self.bigram_probs:
            smoothed_probs = {}
            context_total = self.bigram_context_counts[context_key]
            
            for chord in all_chords:
                original_count = self.bigram_counts[context_key].get(chord, 0)
                smoothed_count = original_count + alpha
                smoothed_probs[chord] = smoothed_count / (context_total + alpha * vocab_size)
            
            self.bigram_probs_smooth[context_key] = smoothed_probs
        
        # Apply smoothing to trigram
        self.trigram_probs_smooth = {}
        for context_key in self.trigram_probs:
            smoothed_probs = {}
            context_total = self.trigram_context_counts[context_key]
            
            for chord in all_chords:
                original_count = self.trigram_counts[context_key].get(chord, 0)
                smoothed_count = original_count + alpha
                smoothed_probs[chord] = smoothed_count / (context_total + alpha * vocab_size)
            
            self.trigram_probs_smooth[context_key] = smoothed_probs
    
    def get_models(self, include_counts: bool = False) -> Dict[str, Dict]:
        """Get normalized models with optional count metadata.
        
        Args:
            include_counts: If True, include count metadata for backoff threshold checking
            
        Returns:
            Dictionary with 'unigram', 'bigram', 'trigram' models
        """
        if not self._normalized:
            self.normalize()
        
        # Use smoothed probabilities if available, otherwise use regular probabilities
        unigram_probs = getattr(self, 'unigram_probs_smooth', self.unigram_probs)
        bigram_probs = getattr(self, 'bigram_probs_smooth', self.bigram_probs)
        trigram_probs = getattr(self, 'trigram_probs_smooth', self.trigram_probs)
        
        models = {
            "unigram": unigram_probs,
            "bigram": bigram_probs,
            "trigram": trigram_probs,
        }
        
        if include_counts:
            models["metadata"] = {
                "unigram_counts": dict(self.unigram_context_counts),
                "bigram_counts": dict(self.bigram_context_counts),
                "trigram_counts": dict(self.trigram_context_counts),
            }
        
        return models

