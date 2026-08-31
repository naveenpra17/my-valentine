import { FinaleMusicalPhase, HeartMotifKind, MotifKind, MusicLayerId, MusicalState } from './musical-choreography.types';

export const MUSIC_LAYERS: MusicLayerId[] = [
  'universe',
  'harmony',
  'pulse',
  'memory',
  'emotional',
  'finale',
  'secret'
];

/** Target layer gains per musical state (0–1). Crossfaded, never hard-cut. */
export const STATE_LAYER_TARGETS: Record<MusicalState, Partial<Record<MusicLayerId, number>>> = {
  silence: {},
  universe: { universe: 0.13, harmony: 0.045 },
  discovery: { universe: 0.1, harmony: 0.065, pulse: 0.018 },
  memory: { universe: 0.055, memory: 0.15, emotional: 0.085 },
  heart: { universe: 0.045, harmony: 0.085, pulse: 0.048, emotional: 0.105 },
  remembers: { universe: 0.035, harmony: 0.095, memory: 0.075, emotional: 0.125 },
  transformation: { universe: 0.025, emotional: 0.095, finale: 0.085 },
  giant_heart: { finale: 0.2, emotional: 0.13, harmony: 0.075 },
  letter: { emotional: 0.085, harmony: 0.055, memory: 0.035 },
  secret: { secret: 0.055, universe: 0.02 },
  ending: {}
};

export const STATE_CROSSFADE_SEC: Partial<Record<MusicalState, number>> = {
  silence: 2.5,
  universe: 3,
  discovery: 1.8,
  memory: 2.2,
  heart: 2.8,
  remembers: 3.8,
  transformation: 4,
  giant_heart: 4.8,
  letter: 2.5,
  secret: 2,
  ending: 4
};

export const STATE_INTENSITY: Record<MusicalState, number> = {
  silence: 0,
  universe: 0.12,
  discovery: 0.18,
  memory: 0.28,
  heart: 0.38,
  remembers: 0.48,
  transformation: 0.58,
  giant_heart: 0.88,
  letter: 0.42,
  secret: 0.08,
  ending: 0
};

export const MOTIF_PRESETS: Record<
  MotifKind,
  { freq: number; type: OscillatorType; dur: number; vol: number; detune?: number }
> = {
  star: { freq: 880, type: 'sine', dur: 0.1, vol: 0.026 },
  photo: { freq: 523, type: 'triangle', dur: 0.18, vol: 0.03 },
  memory: { freq: 440, type: 'sine', dur: 0.22, vol: 0.032 },
  'love-bomb': { freq: 660, type: 'sine', dur: 0.11, vol: 0.034 },
  heart: { freq: 392, type: 'triangle', dur: 0.24, vol: 0.03 },
  envelope: { freq: 330, type: 'sine', dur: 0.26, vol: 0.026 },
  finale: { freq: 523, type: 'sine', dur: 0.42, vol: 0.034 },
  flower: { freq: 659, type: 'sine', dur: 0.2, vol: 0.028, detune: 4 },
  secret: { freq: 277, type: 'sine', dur: 0.35, vol: 0.022 },
  reason: { freq: 494, type: 'triangle', dur: 0.14, vol: 0.024 },
  quote: { freq: 587, type: 'sine', dur: 0.16, vol: 0.024 }
};

export const LAYER_OSCILLATORS: Record<MusicLayerId, { freq: number; type: OscillatorType; detune?: number }[]> = {
  universe: [
    { freq: 55, type: 'sine' },
    { freq: 110, type: 'sine', detune: -3 }
  ],
  harmony: [
    { freq: 164.81, type: 'sine' },
    { freq: 196, type: 'sine', detune: 2 }
  ],
  pulse: [{ freq: 60, type: 'sine' }],
  memory: [
    { freq: 220, type: 'triangle' },
    { freq: 277.18, type: 'sine', detune: -2 }
  ],
  emotional: [
    { freq: 329.63, type: 'sine' },
    { freq: 392, type: 'sine', detune: 3 }
  ],
  finale: [
    { freq: 261.63, type: 'sine' },
    { freq: 329.63, type: 'sine', detune: -4 },
    { freq: 392, type: 'sine', detune: 4 }
  ],
  secret: [{ freq: 174.61, type: 'sine' }]
};

export const LAYER_BASE_GAIN: Record<MusicLayerId, number> = {
  universe: 0.018,
  harmony: 0.012,
  pulse: 0.008,
  memory: 0.014,
  emotional: 0.011,
  finale: 0.01,
  secret: 0.009
};

export function heartTypeToMotif(type: string): MotifKind {
  const map: Record<HeartMotifKind, MotifKind> = {
    photo: 'photo',
    memory: 'memory',
    quote: 'quote',
    reason: 'reason',
    flower: 'flower',
    secret: 'secret',
    'love-bomb': 'love-bomb',
    generic: 'star'
  };
  return map[type as HeartMotifKind] ?? 'star';
}

export function finalePhaseMusical(phase: FinaleMusicalPhase): {
  state?: MusicalState;
  motif?: MotifKind;
  dip?: boolean;
} {
  switch (phase) {
    case 'hold':
      return { state: 'remembers' };
    case 'glow':
      return { state: 'transformation', motif: 'memory' };
    case 'detach':
      return { state: 'transformation' };
    case 'dissolve':
      return { state: 'transformation' };
    case 'spread':
      return { state: 'transformation' };
    case 'pullback':
      return { state: 'transformation' };
    case 'silence':
      return { dip: true };
    case 'converge':
      return { state: 'transformation' };
    case 'giant':
      return { state: 'giant_heart', motif: 'finale' };
    case 'complete':
      return { state: 'giant_heart' };
    default:
      return {};
  }
}

/** Optional file-based stems — place under frontend/src/assets/audio/ */
export const AUDIO_ASSET_PATHS = {
  universeStem: '/assets/audio/stems/universe-pad.mp3',
  harmonyStem: '/assets/audio/stems/harmony.mp3',
  finaleStem: '/assets/audio/stems/finale.mp3',
  legacyBackground: '/assets/audio/background.mp3'
} as const;
