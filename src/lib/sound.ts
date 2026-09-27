/** Tiny Web Audio effects: no audio files, works offline. */
let context: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(frequency: number, durationMs: number, options: { type?: OscillatorType; volume?: number; delayMs?: number } = {}) {
  const ctx = muted ? null : audio();
  if (!ctx) return;
  const { type = 'sine', volume = 0.15, delayMs = 0 } = options;
  const start = ctx.currentTime + delayMs / 1000;
  const end = start + durationMs / 1000;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

function vibrate(pattern: number | number[]) {
  if (!muted && typeof navigator !== 'undefined') navigator.vibrate?.(pattern);
}

export const sounds = {
  /** Also unlocks audio: browsers only allow sound after a user gesture. */
  start() {
    tone(660, 90, { type: 'triangle' });
    tone(990, 140, { type: 'triangle', delayMs: 90 });
  },
  correct() {
    tone(880, 110);
    tone(1320, 170, { delayMs: 100 });
  },
  taboo() {
    tone(150, 420, { type: 'sawtooth', volume: 0.2 });
    vibrate(250);
  },
  pass() {
    tone(520, 120, { type: 'triangle' });
  },
  tick() {
    tone(1000, 60, { type: 'square', volume: 0.05 });
  },
  timeUp() {
    tone(220, 800, { type: 'square', volume: 0.18 });
    vibrate([200, 100, 200]);
  },
};
