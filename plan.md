# Chord Progression Probability Engine - Implementation Plan

## Architecture Overview

**Simple two-tier system:**

1. **Backend Pipeline** (Python): Processes CSV (1k to 680k+ rows), builds 3 global N-gram models using scalable streaming/chunked processing, exports 3 JSON files
2. **Frontend UI** (Next.js): Loads JSON, uses interpolation to compute probabilities, visualizes with bubbles/arrows

**Key principle**: Keep it simple, lightweight, and key-agnostic. This is a portfolio visualization project, not a production music-theory engine. **Design for scalability from the start** - works efficiently with 1k rows and scales to 680k+ rows.

---

## Tech Stack

### Backend Pipeline

- **Data Processing**: `polars` or `duckdb` (fast, memory-efficient CSV parsing, scales to 680k+ rows)
- **Processing Strategy**: 
  - Small datasets (< 10k rows): Load entire CSV in memory
  - Large datasets (≥ 10k rows): Streaming/chunked processing
- **Chord Parsing**: Custom regex-based parser (light normalization only)
- **N-gram Models**: Memory-efficient counting (Counter/dict with incremental updates)
- **Smoothing**: Add-one (Laplace) smoothing for unseen transitions
- **Export**: `json` (3 files total: unigram.json, bigram.json, trigram.json)
- **No external music libraries**: No music21, no complex theory libraries

### Frontend

- **Framework**: Next.js (App Router or Pages Router)
- **UI**: React 18+, Tailwind CSS
- **Visualization**: D3.js or `@visx/visx` (optional, for bubbles/arrows)
- **Data Loading**: Static JSON from `/public/data/`
- **Deployment**: Netlify (static export)

---

## Data Structures

### 1. Chord Representation

```python
# Simple string format (normalized)
Chord = str  # "C", "G", "Amin", "Fmaj7", "C#min", etc.

# Normalization rules:
# - Convert flats to sharps (Db → C#)
# - Remove inversions (C/E → C)
# - Standardize quality names (min, maj, 7, maj7, min7, dim, aug, sus, add)
# - Keep slash chords simple (C/E → C, ignore bass for now)
```

### 2. N-gram Probability Models (Global, Key-Agnostic)

```python
# Unigram model structure
UnigramModel = {
    "C": {"G": 0.30, "F": 0.20, "Amin": 0.18, "Emin": 0.12, ...},
    "G": {"C": 0.25, "Amin": 0.20, "Dmin": 0.15, "Emin": 0.12, ...},
    "Amin": {"F": 0.22, "C": 0.18, "G": 0.15, "Emin": 0.10, ...},
    ...
}

# Bigram model structure
BigramModel = {
    "C,G": {"Amin": 0.40, "F": 0.25, "C": 0.20, "Emin": 0.15, ...},
    "G,Amin": {"F": 0.35, "C": 0.28, "G": 0.15, ...},
    "Amin,F": {"C": 0.45, "G": 0.30, "Amin": 0.15, ...},
    ...
}

# Trigram model structure
TrigramModel = {
    "C,G,Amin": {"F": 0.40, "C": 0.25, "Dmin": 0.15, "Emin": 0.10, ...},
    "G,Amin,F": {"C": 0.50, "G": 0.20, "Amin": 0.15, ...},
    "Amin,F,C": {"G": 0.35, "Amin": 0.25, "F": 0.20, ...},
    ...
}
```

### 3. Frontend State

```typescript
interface AppState {
  currentProgression: string[];   // ["C", "G", "Amin"] (chord names)
  probabilities: {
    unigram: Record<string, Record<string, number>>;
    bigram: Record<string, Record<string, number>>;
    trigram: Record<string, Record<string, number>>;
  };
  interpolationWeights: {
    lambda3: number;  // 0.60 (trigram)
    lambda2: number;  // 0.30 (bigram)
    lambda1: number;  // 0.10 (unigram)
  };
  nextChordProbabilities: Record<string, number>;  // Final blended probabilities
}
```

---

## Algorithms

### 1. Chord Parsing & Normalization

**Algorithm**: Regex-based parser with light normalization

- Strip section tags: `re.sub(r'<[^>]+>', '', text)`
- Tokenize chords: Split on whitespace
- Normalize roots: Convert flats to sharps (Db → C#, Eb → D#)
- Extract quality: Match patterns (maj, min, 7, maj7, min7, dim, aug, sus, add, etc.)
- Simplify: Remove inversions, handle basic slash chords (C/E → C for now)
- Keep it simple: Don't over-parse complex chord notations

**Complexity**: O(n) where n = number of chords per song

**Memory**: O(m) where m = chords in one song (process one song at a time)

### 2. N-gram Model Building (Scalable)

**Algorithm**: Streaming sliding window + incremental frequency counting

- **Processing Strategy**: 
  - For < 10k rows: Load entire dataset in memory
  - For ≥ 10k rows: Process in chunks (streaming/chunked reads)
  - Use Polars lazy evaluation (`scan_csv()`) or DuckDB for efficient CSV reading
- **Memory-Efficient Counting**:
  - Use Python `Counter` or `defaultdict(int)` for incremental counting
  - Process songs one at a time, update counts incrementally
  - Don't store full sequences in memory - only counts
  - Memory usage: O(k) where k = unique n-gram contexts (much smaller than total chords)
- **N-gram Extraction**:
  - **Unigrams**: Count all single chords (first-order Markov)
  - **Bigrams**: Count all (chord_i, chord_i+1) pairs
  - **Trigrams**: Count all (chord_i, chord_i+1, chord_i+2) tuples
- **Global models**: Don't group by key - aggregate all songs together
- **Normalization**: After all processing, normalize counts to probabilities: `P(chord_j | context) = count(context, chord_j) / sum(count(context, *))`
- **Smoothing**: Apply add-one (Laplace) smoothing for unseen transitions
- **Metadata**: Store counts alongside probabilities for backoff threshold checking (minimum count = 3)

**Complexity**: O(n) where n = total chords across all songs

**Memory**: O(k) where k = unique n-gram contexts (typically 1000-10000, not millions)

### 3. Interpolation Algorithm (Frontend)

**Algorithm**: Weighted blending of all three models

```
P_final(next) = λ₃ * P_trigram(next) + λ₂ * P_bigram(next) + λ₁ * P_unigram(next)
```

Where:

- λ₃ = 0.60 (trigram weight)
- λ₂ = 0.30 (bigram weight)  
- λ₁ = 0.10 (unigram weight)
- All probabilities normalized to sum to 1.0

**Soft Backoff Logic** (when context missing or weak):

- If trigram context exists AND count ≥ 3: use all three models with full interpolation
- If trigram missing/weak (< 3): reduce λ₃, increase λ₂ and λ₁ proportionally
- If bigram missing/weak (< 3): reduce λ₂, increase λ₁ (use mostly unigram)
- If unigram missing: use uniform distribution as fallback

**Complexity**: O(1) lookup per model, O(k) for interpolation where k = number of possible next chords

---

## File Structure

```
chord-probability/
├── backend_pipeline/
│   ├── src/
│   │   ├── __init__.py
│   │   ├── chord_parser.py      # Parse & normalize chords (simple)
│   │   ├── data_loader.py       # Scalable CSV loader (chunked/streaming)
│   │   ├── ngram_builder.py     # Build unigram/bigram/trigram models (scalable)
│   │   └── build_models.py       # Main pipeline script
│   ├── data/
│   │   ├── chordonomicon_super_mini.csv  # 1k rows (testing)
│   │   └── chordonomicon_full.csv        # 680k rows (production)
│   ├── exports/
│   │   ├── unigram.json
│   │   ├── bigram.json
│   │   └── trigram.json
│   ├── config.py                 # Configuration (chunk size, file paths, etc.)
│   ├── requirements.txt
│   └── README.md
│
├── frontend_ui/
│   ├── public/
│   │   └── data/
│   │       ├── unigram.json
│   │       ├── bigram.json
│   │       └── trigram.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChordGraph.tsx    # Bubble/arrow visualization
│   │   │   ├── ProgressionBar.tsx
│   │   │   └── ProbabilityBubbles.tsx
│   │   ├── lib/
│   │   │   ├── dataLoader.ts     # Load 3 JSON files
│   │   │   └── probability.ts    # Interpolation logic
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── tsconfig.json
│
├── main.ipynb                    # Exploration notebook
├── context.txt
└── README.md
```

---

## Implementation Steps

### Phase 1: Backend Pipeline

1. **Configuration** (`config.py`)

   - Dataset file path (configurable for 1k vs 680k)
   - Chunk size for large datasets (default: 10k-50k rows)
   - Output directory
   - Processing mode (auto-detect based on file size)
   - Threshold for backoff (default: 3)

2. **Data Loader** (`data_loader.py`) - **Scalable design**

   - **Size Detection**: 
     - Quick scan to estimate row count
     - Or use file size as proxy
   - **Processing Modes**:
     - Small datasets (< 10k rows): Load entire CSV with `polars.read_csv()` or `pandas.read_csv()`
     - Large datasets (≥ 10k rows): Use chunked processing
   - **Chunked Processing**:
     - Use `polars.scan_csv()` with lazy evaluation
     - Or `duckdb.read_csv()` for columnar processing
     - Process in chunks (configurable size: 10k-50k rows)
     - Generator/iterator interface: `yield chunk`
   - **Interface**:
     - `load_data(file_path)` - returns iterator of chunks or full DataFrame
     - `get_row_count(file_path)` - quick row count estimation

3. **Chord Parser** (`chord_parser.py`)

   - Regex patterns for chord extraction
   - Light normalization (flats → sharps, basic quality mapping)
   - Strip section tags `<...>`
   - Handle common edge cases (no3d, sus, add, basic slash chords)
   - **Keep it simple**: Don't over-engineer chord parsing
   - **Memory efficient**: Process one song at a time, return list of chords
   - **Function**: `parse_chords(chord_string) -> List[str]`

4. **N-gram Builder** (`ngram_builder.py`) - **Scalable design**

   - **Incremental Counting Interface**:
     - `__init__()` - initialize empty counters
     - `update_counts(chord_sequence: List[str])` - process one song, update counts incrementally
     - Use `Counter` or `defaultdict(int)` for efficient counting
     - Don't store full sequences - only update counts
   - **Sliding Window Implementation**:
     - Unigram: single chord counts
     - Bigram: (chord_i, chord_i+1) pair counts (store as "C,G" string key)
     - Trigram: (chord_i, chord_i+1, chord_i+2) tuple counts (store as "C,G,Amin" string key)
   - **Final Processing**:
     - `normalize()` - convert counts to probabilities
     - `apply_smoothing()` - add-one (Laplace) smoothing
     - `get_models()` - return normalized models with counts metadata
   - **Memory efficient**: O(k) memory where k = unique n-gram contexts
   - **Progress tracking**: Optional callback for progress updates

5. **Main Pipeline** (`build_models.py`)

   - **Scalable Processing Flow**:

     1. Load configuration
     2. Detect dataset size, choose processing mode
     3. Initialize n-gram builder
     4. Process data:

        - If chunked: iterate through chunks
        - For each song/chunk:
          - Parse chords
          - Extract n-grams
          - Update counts incrementally (`ngram_builder.update_counts()`)
          - Clear parsed data from memory
        - Log progress for large datasets

     1. After all processing:

        - Normalize counts to probabilities
        - Apply smoothing
        - Export 3 JSON files: `unigram.json`, `bigram.json`, `trigram.json`
   - **Progress Tracking**: 
     - Log progress every N songs (e.g., every 10k songs for large datasets)
     - Estimate time remaining
   - **Error Handling**: 
     - Handle malformed rows gracefully
     - Continue processing on errors (log and skip)
     - Final summary of processed vs. skipped rows

### Phase 2: Frontend UI

1. **Data Loading** (`dataLoader.ts`)

   - Load all 3 JSON files on app start (or lazy load)
   - Cache loaded data
   - Type-safe interfaces
   - Error handling for missing files

2. **Probability Calculator** (`probability.ts`)

   - Implement interpolation algorithm
   - Handle soft backoff (adjust λ weights based on context strength)
   - Compute final probability vector for next chords
   - Function: `computeProbabilities(progression: string[], models: Models, weights: Weights) -> Record<string, number>`

3. **Progression Bar** (`ProgressionBar.tsx`)

   - Display current chord sequence
   - Allow clicking chords to add to progression
   - Show current progression state
   - Clear/reset functionality

4. **Probability Visualization** (`ProbabilityBubbles.tsx` or `ChordGraph.tsx`)

   - Display next-chord probabilities as bubbles (size = probability)
   - Show arrows/connections from current progression
   - Interactive: click bubble to add chord to progression
   - Optional: D3/visx for animated transitions
   - Limit display to top N probabilities for performance

5. **Main Page** (`app/page.tsx`)

   - Compose all components
   - State management (React hooks)
   - Responsive layout
   - **No key selector** - key-agnostic system

### Phase 3: Optimization & Polish

- JSON size optimization (filter very low probabilities if files get too large)
- Loading states
- Error handling (missing contexts, empty progressions)
- Responsive design
- Smooth animations for bubble updates

---

## Performance Considerations

### Backend Scalability

**Small datasets (1k-10k rows)**:

- Load entire CSV in memory
- Process directly with pandas/polars
- Fast and simple

**Large datasets (680k+ rows)**:

- **Chunked Processing**:
  - Use Polars lazy evaluation (`scan_csv()`) or DuckDB
  - Process in chunks (10k-50k rows at a time)
  - Stream processing: Read → Parse → Count → Discard
- **Memory Efficiency**:
  - Only store n-gram counts (O(k) where k = unique contexts)
  - Don't store full sequences
  - Clear processed data from memory after counting
- **Optimization Strategies**:
  - Use `polars.scan_csv()` for lazy evaluation
  - Or `duckdb.read_csv()` for fast columnar processing
  - Incremental counting with `Counter` or `defaultdict(int)`
  - Optional: Process chunks in parallel (if needed)
- **Progress Tracking**: 
  - Log progress every N songs
  - Estimate time remaining
  - Show memory usage

**Expected Performance**:

- 1k rows: < 1 second
- 680k rows: 5-15 minutes (depending on hardware and chunk size)

### Frontend

- **JSON size**: 
  - For 1k rows: Files should be small (< 1MB each)
  - For 680k rows: May need filtering (remove probabilities < 0.001 or < 0.0001)
  - Consider compression or sparse format if files get too large (> 10MB each)
- **Loading**: Load 3 JSON files once on app start (or lazy load on first use)
- **Visualization**: Limit displayed chords to top N probabilities for performance

---

## Testing Strategy

- Unit tests for chord parser (edge cases: slash chords, extensions, normalization)
- Unit tests for n-gram builder (sliding window, probability normalization, incremental counting)
- Unit tests for data loader (chunked vs. full load, size detection)
- Unit tests for interpolation algorithm (backoff logic, weight adjustment)
- Integration test for full pipeline (CSV → 3 JSON files)
- Performance test: Verify scalability with large dataset (680k rows)
- Frontend: Component tests with mock JSON data

---

## Key Design Decisions

1. **Key-agnostic**: No key inference, no per-key models - just global chord transition patterns
2. **Three global models**: One unigram, one bigram, one trigram file (not 72 files)
3. **Simple chord names**: Use actual chord names (C, G, Amin) - no Roman numerals
4. **Interpolation**: Weighted blending (λ₃=0.60, λ₂=0.30, λ₁=0.10) with soft backoff
5. **Lightweight**: No music21, no complex theory libraries, minimal dependencies
6. **Static JSON**: Pre-computed probabilities, no runtime computation in backend
7. **Section-agnostic**: Strip all `<...>` tags before processing
8. **Scalable architecture**: 

   - Automatic detection of dataset size
   - Chunked/streaming processing for large datasets (680k+ rows)
   - Memory-efficient incremental counting (only store n-gram counts, not sequences)
   - Polars/DuckDB for efficient CSV reading at scale
   - Works efficiently with 1k rows and scales seamlessly to 680k+ rows

---

## Scope Restrictions (Important)

**DO NOT implement:**

- Key inference
- Roman numeral conversion
- Per-key probability models (24 keys × 3 models)
- Genre/context-aware models
- Machine learning (LSTM/Transformer)
- Complex chord-type parsing
- music21 or other music theory libraries
- Harmonic function clustering
- MIDI/audio features
- Database integration

**Keep it simple, lightweight, and focused on N-gram statistics with interpolation. Design for scalability from the start.**