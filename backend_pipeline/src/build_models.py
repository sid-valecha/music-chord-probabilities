"""Main pipeline script to build chord probability models from CSV data."""

import json
import sys
from pathlib import Path
from typing import Optional
import polars as pl

# Add parent directory to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend_pipeline.config import (
    DEFAULT_DATASET,
    OUTPUT_FILES,
    CHUNK_SIZE,
    BACKOFF_THRESHOLD,
)
from backend_pipeline.src.chord_parser import parse_chords
from backend_pipeline.src.data_loader import load_data, get_chord_column_name
from backend_pipeline.src.ngram_builder import NGramBuilder


def process_dataset(
    dataset_path: Path,
    chunk_size: int = CHUNK_SIZE,
    progress_interval: int = 10000,
) -> NGramBuilder:
    """Process dataset and build n-gram models.
    
    Args:
        dataset_path: Path to CSV dataset
        chunk_size: Size of chunks for large datasets
        progress_interval: Log progress every N songs
        
    Returns:
        NGramBuilder instance with built models
    """
    print(f"\n{'='*60}")
    print(f"Building chord probability models from: {dataset_path.name}")
    print(f"{'='*60}\n")
    
    # Initialize n-gram builder
    ngram_builder = NGramBuilder()
    
    # Track progress
    total_songs = 0
    processed_songs = 0
    skipped_songs = 0
    
    # Load and process data
    try:
        for chunk_df in load_data(dataset_path, chunk_size=chunk_size):
            # Get chord column name
            try:
                chord_column = get_chord_column_name(chunk_df)
            except ValueError as e:
                print(f"Error: {e}")
                continue
            
            # Process each row (song) in chunk
            for row in chunk_df.iter_rows(named=True):
                total_songs += 1
                chord_string = row.get(chord_column, "")
                
                if not chord_string or not isinstance(chord_string, str):
                    skipped_songs += 1
                    continue
                
                # Parse chords
                try:
                    chord_sequence = parse_chords(chord_string)
                    
                    if len(chord_sequence) < 2:
                        # Need at least 2 chords for unigram
                        skipped_songs += 1
                        continue
                    
                    # Update n-gram counts
                    ngram_builder.update_counts(chord_sequence)
                    processed_songs += 1
                    
                    # Progress logging
                    if processed_songs % progress_interval == 0:
                        print(f"  Processed {processed_songs} songs...")
                        
                except Exception as e:
                    skipped_songs += 1
                    if processed_songs < 10:  # Only log first few errors
                        print(f"  Warning: Skipped song due to error: {e}")
                    continue
    
    except Exception as e:
        print(f"\nError processing dataset: {e}")
        raise
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Processing complete!")
    print(f"  Total songs: {total_songs}")
    print(f"  Processed: {processed_songs}")
    print(f"  Skipped: {skipped_songs}")
    print(f"{'='*60}\n")
    
    return ngram_builder


def export_models(ngram_builder: NGramBuilder, output_dir: Path):
    """Export models to JSON files.
    
    Args:
        ngram_builder: NGramBuilder instance with built models
        output_dir: Directory to save JSON files
    """
    print("Normalizing probabilities and applying smoothing...")
    
    # Normalize and apply smoothing
    ngram_builder.normalize()
    ngram_builder.apply_smoothing(alpha=1.0)
    
    # Get models with count metadata for backoff threshold checking
    models = ngram_builder.get_models(include_counts=True)
    
    # Convert models to JSON-serializable format
    # Unigram: models["unigram"] is already a dict of {context: {next_chord: prob}}
    unigram_export = models["unigram"]
    
    # Export each model
    output_files = {
        "unigram": output_dir / "unigram.json",
        "bigram": output_dir / "bigram.json",
        "trigram": output_dir / "trigram.json",
    }
    
    print("\nExporting models to JSON...")
    
    # Export unigram
    with open(output_files["unigram"], "w") as f:
        json.dump(unigram_export, f, indent=2)
    print(f"  ✓ Exported unigram model: {output_files['unigram']}")
    print(f"    Contexts: {len(unigram_export)}")
    
    # Export bigram
    with open(output_files["bigram"], "w") as f:
        json.dump(models["bigram"], f, indent=2)
    print(f"  ✓ Exported bigram model: {output_files['bigram']}")
    print(f"    Contexts: {len(models['bigram'])}")
    
    # Export trigram
    with open(output_files["trigram"], "w") as f:
        json.dump(models["trigram"], f, indent=2)
    print(f"  ✓ Exported trigram model: {output_files['trigram']}")
    print(f"    Contexts: {len(models['trigram'])}")
    
    # Export metadata (counts) for backoff threshold checking
    metadata_file = output_dir / "metadata.json"
    with open(metadata_file, "w") as f:
        json.dump(models["metadata"], f, indent=2)
    print(f"  ✓ Exported metadata: {metadata_file}")
    
    print("\n✓ All models exported successfully!\n")


def main():
    """Main entry point for building models."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Build chord probability models from CSV dataset")
    parser.add_argument(
        "--dataset",
        type=str,
        default=str(DEFAULT_DATASET),
        help="Path to CSV dataset file",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).parent.parent / "exports"),
        help="Output directory for JSON files",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=CHUNK_SIZE,
        help="Chunk size for large datasets",
    )
    
    args = parser.parse_args()
    
    dataset_path = Path(args.dataset)
    output_dir = Path(args.output_dir)
    
    if not dataset_path.exists():
        print(f"Error: Dataset file not found: {dataset_path}")
        sys.exit(1)
    
    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process dataset
    ngram_builder = process_dataset(dataset_path, chunk_size=args.chunk_size)
    
    # Export models
    export_models(ngram_builder, output_dir)
    
    print("Done! Models are ready for frontend use.")


if __name__ == "__main__":
    main()

