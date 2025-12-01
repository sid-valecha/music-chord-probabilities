"""Parse and normalize chord sequences from raw chord strings."""

import re
from typing import List


def normalize_root(note: str) -> str:
    """Convert flats to sharps for consistent root note representation.
    
    Args:
        note: Root note (e.g., "Db", "Eb", "C#")
        
    Returns:
        Normalized root note using sharps (e.g., "C#", "D#", "C#")
    """
    flat_to_sharp = {
        "Db": "C#",
        "Eb": "D#",
        "Gb": "F#",
        "Ab": "G#",
        "Bb": "A#",
    }
    return flat_to_sharp.get(note, note)


def parse_chord(chord_str: str) -> str:
    """Parse and normalize a single chord string.
    
    Handles:
    - Root note normalization (flats → sharps)
    - Quality extraction (maj, min, 7, maj7, min7, dim, aug, sus, add, etc.)
    - Slash chord simplification (C/E → C, ignore bass for now)
    - Inversion removal
    
    Args:
        chord_str: Raw chord string (e.g., "C", "Amin", "Fmaj7", "C/E", "no3d")
        
    Returns:
        Normalized chord string (e.g., "C", "Amin", "Fmaj7")
    """
    if not chord_str or chord_str.strip() == "":
        return None
    
    chord_str = chord_str.strip()
    
    # Handle special cases
    if "no3d" in chord_str.lower():
        # Remove no3d notation, keep the root
        chord_str = re.sub(r'no3d', '', chord_str, flags=re.IGNORECASE)
    
    # Handle slash chords (C/E → C, ignore bass)
    if "/" in chord_str:
        chord_str = chord_str.split("/")[0]
    
    # Extract root note (first 1-2 characters, handling sharps/flats)
    root_match = re.match(r'^([A-G][#b]?)', chord_str)
    if not root_match:
        return None
    
    root = root_match.group(1)
    root = normalize_root(root)
    
    # Extract quality (everything after root)
    quality_part = chord_str[len(root_match.group(0)):].strip()
    
    # Normalize common quality patterns
    quality_map = {
        "": "maj",  # Default to major if no quality specified
        "m": "min",
        "min": "min",
        "minor": "min",
        "maj": "maj",
        "major": "maj",
        "M": "maj",
        "dim": "dim",
        "diminished": "dim",
        "aug": "aug",
        "augmented": "aug",
        "sus": "sus",
        "sus4": "sus4",
        "sus2": "sus2",
        "add9": "add9",
        "add11": "add11",
        "add13": "add13",
    }
    
    # Handle extensions (7, maj7, min7, etc.)
    if "maj7" in quality_part or "M7" in quality_part:
        quality = "maj7"
    elif "min7" in quality_part or "m7" in quality_part:
        quality = "min7"
    elif "7" in quality_part:
        quality = "7"
    elif "dim" in quality_part:
        quality = "dim"
    elif "aug" in quality_part:
        quality = "aug"
    elif "sus" in quality_part:
        if "sus4" in quality_part:
            quality = "sus4"
        elif "sus2" in quality_part:
            quality = "sus2"
        else:
            quality = "sus"
    elif "add" in quality_part:
        if "add9" in quality_part:
            quality = "add9"
        elif "add11" in quality_part:
            quality = "add11"
        elif "add13" in quality_part:
            quality = "add13"
        else:
            quality = "add"
    elif quality_part.lower() in ["m", "min", "minor"]:
        quality = "min"
    elif quality_part.lower() in ["maj", "major", "M", ""]:
        quality = "maj"
    else:
        # Default: try to map or use as-is
        quality = quality_map.get(quality_part.lower(), quality_part.lower() if quality_part else "maj")
    
    # Construct normalized chord
    if quality == "maj":
        return root  # Omit "maj" for major chords (C instead of Cmaj)
    else:
        return f"{root}{quality}"


def parse_chords(chord_string: str) -> List[str]:
    """Parse a chord sequence string into a list of normalized chords.
    
    Strips section tags like <verse_1>, <chorus_2>, etc.
    Normalizes each chord and filters out invalid/empty chords.
    
    Args:
        chord_string: Raw chord sequence string with section tags
        
    Returns:
        List of normalized chord strings
    """
    if not chord_string or not isinstance(chord_string, str):
        return []
    
    # Strip section tags (<verse_1>, <chorus_2>, etc.)
    chord_string = re.sub(r'<[^>]+>', '', chord_string)
    
    # Split on whitespace
    raw_chords = chord_string.split()
    
    # Parse and normalize each chord
    parsed_chords = []
    for raw_chord in raw_chords:
        normalized = parse_chord(raw_chord)
        if normalized:  # Filter out None/empty chords
            parsed_chords.append(normalized)
    
    return parsed_chords

