import { Injectable, inject, signal } from '@angular/core';
import { MotionService } from './motion.service';
import { ExperienceStateService } from '../experience/experience-state.service';

type SfxId =
  | 'star'
  | 'photo'
  | 'memory'
  | 'love-bomb'
  | 'heart'
  | 'envelope'
  | 'finale';

@Injectable({ providedIn: 'root' })
export class SoundDesignService {
  private readonly motion = inject(MotionService);
  private readonly experience = inject(ExperienceStateService);
  private ctx?: AudioContext;
  readonly enabled = signal(false);

  enable(): void {
    if (this.motion.prefersReducedMotion()) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    void this.ctx.resume();
    this.enabled.set(true);
    this.experience.setMusicEnabled(true);
  }

  play(id: SfxId): void {
    if (!this.enabled() || this.motion.prefersReducedMotion() || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const presets: Record<SfxId, { freq: number; type: OscillatorType; dur: number; vol: number }> = {
      star: { freq: 880, type: 'sine', dur: 0.12, vol: 0.04 },
      photo: { freq: 520, type: 'triangle', dur: 0.18, vol: 0.05 },
      memory: { freq: 440, type: 'sine', dur: 0.22, vol: 0.05 },
      'love-bomb': { freq: 660, type: 'sine', dur: 0.15, vol: 0.06 },
      heart: { freq: 392, type: 'triangle', dur: 0.25, vol: 0.05 },
      envelope: { freq: 330, type: 'sine', dur: 0.3, vol: 0.04 },
      finale: { freq: 523, type: 'sine', dur: 0.5, vol: 0.06 }
    };

    const p = presets[id];
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, now);
    osc.frequency.exponentialRampToValueAtTime(p.freq * 1.5, now + p.dur * 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(p.vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.dur);
    osc.start(now);
    osc.stop(now + p.dur + 0.05);
  }
}
