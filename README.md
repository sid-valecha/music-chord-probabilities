# Chord Probability Engine

A chord progression probability explorer built with N-gram models. This project analyzes chord sequences from the Chordonomicon dataset and provides an interactive web interface for exploring chord transition probabilities.

## Features

- **Scalable Backend Pipeline**: Processes datasets from 1k to 680k+ rows efficiently
- **Three N-gram Models**: Unigram, bigram, and trigram models for chord prediction
- **Interpolation**: Weighted blending of models with soft backoff for sparse contexts
- **Interactive Frontend**: Visualize probabilities with bubble sizes and build progressions
- **Key-Agnostic**: Works with actual chord names, no key inference required

## Project Structure

```
chord-probability/
├── backend_pipeline/     # Python pipeline for building models
│   ├── src/              # Source code
│   ├── exports/          # Generated JSON models
│   └── data/             # Dataset files
├── frontend_ui/          # Next.js frontend
│   ├── src/              # React components and logic
│   └── public/data/       # JSON model files (copied from backend)
└── data/                 # Original dataset
```

## Quick Start

### Backend Pipeline

1. Install dependencies:
```bash
conda activate env1
pip install -r backend_pipeline/requirements.txt
```

2. Build models from dataset:
```bash
python -m backend_pipeline.src.build_models --dataset data/chordonomicon_mini.csv
```

3. Copy generated models to frontend:
```bash
cp backend_pipeline/exports/*.json frontend_ui/public/data/
```

### Frontend

1. Install dependencies:
```bash
cd frontend_ui
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Build Models**: Run the backend pipeline to process your dataset and generate probability models
2. **Explore**: Use the frontend to click chords and see next-chord probabilities
3. **Visualize**: Bubble sizes represent probability - larger bubbles are more likely next chords

## Architecture

### Backend
- **Scalable Processing**: Automatically detects dataset size and uses chunked processing for large files
- **Memory Efficient**: Only stores n-gram counts, not full sequences
- **Three Models**: Unigram (P(next|current)), Bigram (P(next|last 2)), Trigram (P(next|last 3))

### Frontend
- **Interpolation**: Combines models with weights (λ₃=0.60, λ₂=0.30, λ₁=0.10)
- **Soft Backoff**: Adjusts weights when contexts are sparse (< 3 occurrences)
- **Interactive**: Click chords to build progressions and see real-time probabilities

## Configuration

Edit `backend_pipeline/config.py` to adjust:
- Chunk size for large datasets
- Backoff threshold
- Dataset paths
- Output directories

## Deployment

The frontend is configured for static export and can be deployed to Netlify or any static hosting service:

```bash
cd frontend_ui
npm run build
# Deploy the 'out' directory
```

## License

MIT

