"""Scalable CSV data loader with chunked processing support."""

import os
from pathlib import Path
from typing import Iterator, Union
import polars as pl


def get_row_count(file_path: Union[str, Path]) -> int:
    """Quickly estimate row count of a CSV file.
    
    Uses Polars lazy evaluation to count rows without loading full file.
    
    Args:
        file_path: Path to CSV file
        
    Returns:
        Estimated row count
    """
    try:
        # Use lazy evaluation to count rows efficiently
        df = pl.scan_csv(str(file_path))
        return df.select(pl.len()).collect().item()
    except Exception as e:
        # Fallback: try reading first few rows to estimate
        try:
            df = pl.read_csv(str(file_path), n_rows=1000)
            # Estimate based on file size (rough approximation)
            file_size = os.path.getsize(file_path)
            sample_size = len(df)
            if sample_size > 0:
                bytes_per_row = file_size / max(1, sample_size)
                estimated_rows = int(file_size / bytes_per_row) if bytes_per_row > 0 else 0
                return estimated_rows
        except:
            pass
        raise ValueError(f"Could not determine row count for {file_path}: {e}")


def load_data(file_path: Union[str, Path], chunk_size: int = 10000) -> Iterator[pl.DataFrame]:
    """Load CSV data with automatic chunked processing for large files.
    
    Automatically detects file size and chooses appropriate loading strategy:
    - Small files (< threshold): Load entire file
    - Large files (>= threshold): Load in chunks
    
    Args:
        file_path: Path to CSV file
        chunk_size: Number of rows per chunk for large files
        
    Yields:
        DataFrame chunks (or single DataFrame for small files)
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")
    
    # Detect file size
    try:
        row_count = get_row_count(file_path)
    except Exception as e:
        # Fallback: use file size as proxy
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        # Rough estimate: ~1KB per row (conservative)
        row_count = int(file_size_mb * 1024)
    
    # Determine processing mode
    SMALL_DATASET_THRESHOLD = 10000  # Use chunked processing if >= this many rows
    
    if row_count < SMALL_DATASET_THRESHOLD:
        # Small dataset: load entire file
        print(f"Loading small dataset ({row_count} rows) - loading entire file...")
        df = pl.read_csv(str(file_path))
        yield df
    else:
        # Large dataset: use chunked processing
        print(f"Loading large dataset ({row_count} rows) - using chunked processing (chunk size: {chunk_size})...")
        
        # Use lazy evaluation with streaming
        lazy_df = pl.scan_csv(str(file_path))
        
        # Process in chunks
        offset = 0
        while offset < row_count:
            chunk = lazy_df.slice(offset, chunk_size).collect()
            if len(chunk) == 0:
                break
            yield chunk
            offset += chunk_size
            
            # Progress indicator
            if offset % (chunk_size * 10) == 0:
                print(f"  Processed {min(offset, row_count)} / {row_count} rows...")


def get_chord_column_name(df: pl.DataFrame) -> str:
    """Detect the name of the chord column in the DataFrame.
    
    Looks for common column names like 'chords', 'chord', 'progression', etc.
    
    Args:
        df: DataFrame to search
        
    Returns:
        Column name containing chords
    """
    # Common column names for chords
    possible_names = ["chords", "chord", "progression", "chord_sequence", "chord_progression"]
    
    for name in possible_names:
        if name in df.columns:
            return name
    
    # If not found, return first column (assume it's the chord column)
    if len(df.columns) > 0:
        return df.columns[0]
    
    raise ValueError("Could not find chord column in dataset")

