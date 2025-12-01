# Backend Pipeline

Backend pipeline for building chord probability models from CSV data.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

Process the default dataset (1k rows):
```bash
python -m backend_pipeline.src.build_models
```

### Custom Dataset

Process a custom dataset:
```bash
python -m backend_pipeline.src.build_models --dataset path/to/dataset.csv
```

### Custom Output Directory

Specify output directory:
```bash
python -m backend_pipeline.src.build_models --output-dir path/to/output
```

### Chunk Size

Adjust chunk size for large datasets:
```bash
python -m backend_pipeline.src.build_models --chunk-size 50000
```

## Output

The pipeline generates three JSON files:
- `unigram.json` - First-order Markov model (P(next | current))
- `bigram.json` - Bigram model (P(next | last 2 chords))
- `trigram.json` - Trigram model (P(next | last 3 chords))
- `metadata.json` - Count metadata for backoff threshold checking

## Architecture

- **Scalable**: Automatically detects dataset size and uses chunked processing for large files (680k+ rows)
- **Memory-efficient**: Only stores n-gram counts, not full sequences
- **Key-agnostic**: Global models, no key inference or Roman numeral conversion

## Components

- `config.py` - Configuration settings
- `src/chord_parser.py` - Parse and normalize chord strings
- `src/data_loader.py` - Scalable CSV loader with chunked processing
- `src/ngram_builder.py` - Build n-gram models with incremental counting
- `src/build_models.py` - Main pipeline script

