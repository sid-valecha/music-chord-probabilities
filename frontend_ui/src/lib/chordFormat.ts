export function formatChordDisplay(chord: string): string {
  if (!chord) return chord;

  // Convert "Csmin" -> "C#min" but keep "Csus4" as "Csus4".
  return chord.replace(/^([A-G])s(?!us)/, '$1#');
}
