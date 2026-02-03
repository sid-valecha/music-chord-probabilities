import { Midi } from '@tonejs/midi';
import { formatChordDisplay } from '@/lib/chordFormat';

const BPM = 120;
const BEATS_PER_BAR = 4;
const CHORD_BEATS = 4;
const BASE_MIDI = 60; // C4

const ROOT_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function splitChord(chord: string): { root: string; quality: string } | null {
  if (!chord) return null;
  const trimmed = chord.trim();
  if (trimmed.length === 0) return null;

  const letter = trimmed[0]?.toUpperCase();
  if (!letter || !'ABCDEFG'.includes(letter)) return null;

  let rest = trimmed.slice(1);
  let accidental = '';

  if (rest.startsWith('#') || rest.startsWith('b')) {
    accidental = rest[0];
    rest = rest.slice(1);
  } else if (rest.startsWith('s') && !rest.startsWith('sus')) {
    accidental = '#';
    rest = rest.slice(1);
  }

  return { root: `${letter}${accidental}`, quality: rest.toLowerCase() };
}

function chordIntervals(quality: string): number[] {
  if (!quality || quality === 'maj' || quality === 'major') {
    return [0, 4, 7];
  }
  if (quality === 'min' || quality === 'm' || quality === 'minor') {
    return [0, 3, 7];
  }
  if (quality === '7') {
    return [0, 4, 7, 10];
  }
  if (quality === 'maj7' || quality === 'M7') {
    return [0, 4, 7, 11];
  }
  if (quality === 'min7' || quality === 'm7') {
    return [0, 3, 7, 10];
  }
  if (quality === 'dim' || quality === 'diminished') {
    return [0, 3, 6];
  }
  if (quality === 'aug' || quality === 'augmented') {
    return [0, 4, 8];
  }
  if (quality === 'sus2') {
    return [0, 2, 7];
  }
  if (quality === 'sus4' || quality === 'sus') {
    return [0, 5, 7];
  }

  // Fallback: use a triad based on whether the quality hints at minor.
  if (quality.includes('min')) {
    return [0, 3, 7];
  }
  return [0, 4, 7];
}

function chordToMidiNotes(chord: string): number[] {
  const parsed = splitChord(chord);
  if (!parsed) return [];

  const semitone = ROOT_TO_SEMITONE[parsed.root];
  if (semitone === undefined) return [];

  const intervals = chordIntervals(parsed.quality);
  return intervals.map((interval) => BASE_MIDI + semitone + interval);
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function buildMidiFile(chords: string[]): ArrayBuffer {
  const midi = new Midi();
  midi.header.setTempo(BPM);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [BEATS_PER_BAR, 4] });

  const track = midi.addTrack();
  track.instrument.number = 0;
  track.instrument.name = 'Acoustic Grand Piano';
  track.name = 'Chords';

  const secondsPerBeat = 60 / BPM;
  const chordDuration = CHORD_BEATS * secondsPerBeat;

  chords.forEach((chord, index) => {
    const notes = chordToMidiNotes(chord);
    if (notes.length === 0) return;
    const time = index * chordDuration;
    notes.forEach((note) => {
      track.addNote({
        midi: note,
        time,
        duration: chordDuration,
        velocity: 0.8,
      });
    });
  });

  const bytes = midi.toArray();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function makeMidiFilename(chords: string[]): string {
  if (chords.length === 0) return 'progression.mid';

  const safe = chords
    .map((chord) => formatChordDisplay(chord))
    .map((chord) => chord.replace(/[^A-Za-z0-9#-]+/g, '_'))
    .join('_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${safe || 'progression'}.mid`;
}

let audioContext: AudioContext | null = null;
const stopListeners = new Set<() => void>();

export function onPlaybackStopped(listener: () => void): () => void {
  stopListeners.add(listener);
  return () => stopListeners.delete(listener);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  return audioContext;
}

export async function playChordProgression(chords: string[]): Promise<number> {
  if (chords.length === 0) return 0;

  const ctx = getAudioContext();
  if (!ctx) return 0;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const secondsPerBeat = 60 / BPM;
  const chordDuration = CHORD_BEATS * secondsPerBeat;
  const totalDuration = chords.length * chordDuration;
  const startTime = ctx.currentTime + 0.05;

  chords.forEach((chord, index) => {
    const notes = chordToMidiNotes(chord);
    if (notes.length === 0) return;
    const time = startTime + index * chordDuration;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToFrequency(note), time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.25, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + chordDuration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + chordDuration + 0.05);
    });
  });

  return totalDuration;
}

export async function stopChordProgression(): Promise<void> {
  if (!audioContext) return;
  const ctx = audioContext;
  audioContext = null;
  try {
    if (ctx.state !== 'closed') {
      await ctx.close();
    }
  } catch (error) {
    console.warn('Failed to stop audio context:', error);
  } finally {
    stopListeners.forEach((listener) => listener());
  }
}
