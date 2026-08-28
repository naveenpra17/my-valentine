import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private audio: HTMLAudioElement | null = null;

  readonly playing = signal(false);
  readonly muted = signal(false);
  readonly volume = signal(0.5);
  readonly loaded = signal(false);

  init(src: string): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = this.volume();
    this.audio.preload = 'metadata';

    this.audio.addEventListener('canplaythrough', () => this.loaded.set(true), { once: true });
    this.audio.addEventListener('play', () => this.playing.set(true));
    this.audio.addEventListener('pause', () => this.playing.set(false));
    this.audio.addEventListener('error', () => this.loaded.set(false));
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch {
      // Browser blocked autoplay — user must interact first
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  toggle(): void {
    if (this.playing()) {
      this.pause();
    } else {
      void this.play();
    }
  }

  setVolume(value: number): void {
    const v = Math.max(0, Math.min(1, value));
    this.volume.set(v);
    if (this.audio) {
      this.audio.volume = v;
      if (v > 0) {
        this.audio.muted = false;
        this.muted.set(false);
      }
    }
  }

  toggleMute(): void {
    if (!this.audio) return;
    const next = !this.muted();
    this.audio.muted = next;
    this.muted.set(next);
  }
}
