"""Configuration for chord probability model building."""

import os
from pathlib import Path

# Base directory (project root)
BASE_DIR = Path(__file__).parent.parent

# Data paths
DATA_DIR = BASE_DIR / "data"
EXPORTS_DIR = BASE_DIR / "backend_pipeline" / "exports"

# Dataset files
DATASET_MINI = DATA_DIR / "chordonomicon_mini.csv"  # 5k rows
DATASET_FULL = DATA_DIR / "chordonomicon_full.csv"  # 680k rows (if available)

# Default dataset (use mini for testing)
DEFAULT_DATASET = DATASET_MINI

# Processing configuration
CHUNK_SIZE = 10000  # Rows per chunk for large datasets
SMALL_DATASET_THRESHOLD = 10000  # Use chunked processing if >= this many rows

# Backoff threshold
BACKOFF_THRESHOLD = 3  # Minimum count for n-gram context to be considered strong

# Interpolation weights (for reference, used in frontend)
LAMBDA_WEIGHTS = {
    "lambda3": 0.60,  # Trigram weight
    "lambda2": 0.30,  # Bigram weight
    "lambda1": 0.10,  # Unigram weight
}

# Output files
OUTPUT_FILES = {
    "unigram": EXPORTS_DIR / "unigram.json",
    "bigram": EXPORTS_DIR / "bigram.json",
    "trigram": EXPORTS_DIR / "trigram.json",
}

# Ensure exports directory exists
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

