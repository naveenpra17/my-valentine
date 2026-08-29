import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { MotionService } from '../services/motion.service';
import { ExperienceStateService } from '../experience/experience-state.service';
import {
  LAYER_BASE_GAIN,
  LAYER_OSCILLATORS,
  MOTIF_PRESETS,
  STATE_CROSSFADE_SEC,
  STATE_INTENSITY,
  STATE_LAYER_TARGETS,
  finalePhaseMusical,
  heartTypeToMotif
} from './musical-choreography.config';
import {
  FinaleMusicalPhase,
  HeartMotifKind,
  MotifKind,
  MusicLayerId,
  MusicalState
} from './musical-choreography.types';

interface LayerNodes {
  gain: GainNode;
  oscillators: OscillatorNode[];
  started: boolean;
}

@Injectable({ providedIn: 'root' })
export class MusicalChoreographyService implements OnDestroy {
  private readonly motion = inject(MotionService);
  private readonly experience = inject(ExperienceStateService);

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private pulseLfo: OscillatorNode | null = null;
  private pulseLfoGain: GainNode | null = null;
  private readonly layers = new Map<MusicLayerId, LayerNodes>();
  private currentLayerGains: Record<MusicLayerId, number> = this.zeroLayers();
  private targetLayerGains: Record<MusicLayerId, number> = this.zeroLayers();
  private crossfadeStart: Record<MusicLayerId, number> = this.zeroLayers();
  private crossfadeEndAt = 0;
  private crossfadeFrom = 0;
  private crossfadeDuration = 0;
  private crossfadeRaf = 0;
  private tabHidden = false;
  private userMuted = false;
  private layersStarted = false;
  private heartAttachCount = 0;
  private reasonCount = 0;
  private memoryExitTimer: ReturnType<typeof setTimeout> | null = null;
  private heartCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  private dipTimer: ReturnType<typeof setTimeout> | null = null;
  private preFinalePreloaded = false;

  readonly enabled = signal(false);
  readonly muted = signal(false);
  readonly musicalState = signal<MusicalState>('silence');
  readonly musicIntensity = signal(0);

  private readonly onVisibility = (): void => {
    this.tabHidden = document.hidden;
    this.applyMasterGain();
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.dispose();
  }

  /** Unlock audio after first user gesture. */
  enable(): void {
    if (this.motion.prefersReducedMotion()) return;
    const ctx = this.ensureContext();
    void ctx.resume();
    this.startLayers();
    this.enabled.set(true);
    this.experience.setMusicEnabled(true);
    if (this.musicalState() === 'silence') {
      this.enterOpening();
    }
  }

  setMuted(muted: boolean): void {
    this.userMuted = muted;
    this.muted.set(muted);
    this.applyMasterGain();
  }

  toggleMute(): boolean {
    this.setMuted(!this.userMuted);
    return this.userMuted;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyMasterGain();
  }

  private musicVolume = 0.55;

  reset(): void {
    this.clearTimers();
    this.heartAttachCount = 0;
    this.reasonCount = 0;
    this.transitionTo('silence', 0.5);
    this.musicIntensity.set(0);
  }

  // ——— Journey hooks ———

  enterOpening(): void {
    this.transitionTo('silence', 2);
    this.rampLayer('universe', 0.04, 4);
  }

  onFirstInteraction(): void {
    this.enable();
    this.playMotif('star', 0.7);
    this.transitionTo('universe', 3);
  }

  enterUniverse(): void {
    this.transitionTo('universe', 2.8);
  }

  onDiscoveryApproach(): void {
    if (this.musicalState() !== 'discovery') {
      this.transitionTo('discovery', 1.2);
    }
  }

  onDiscovery(): void {
    this.transitionTo('discovery', 1.5);
  }

  onPhoto(): void {
    this.playMotif('photo');
    this.transitionTo('discovery', 1);
  }

  onMemory(): void {
    this.clearMemoryExit();
    this.playMotif('memory');
    this.transitionTo('memory', 2);
  }

  onMemoryExit(): void {
    this.clearMemoryExit();
    this.memoryExitTimer = setTimeout(() => {
      this.transitionTo('universe', 3.5);
    }, 400);
  }

  onReason(): void {
    this.reasonCount += 1;
    const richness = Math.min(0.35, 0.08 + this.reasonCount * 0.04);
    this.playMotif('reason', 0.85 + richness * 0.3);
    this.rampLayer('harmony', 0.045 + richness * 0.04, 1.5);
  }

  onLoveBomb(): void {
    this.playMotif('love-bomb');
    this.rampLayer('pulse', 0.03, 0.25);
    setTimeout(() => this.restoreStateLayers(0.8), 450);
  }

  onFlower(): void {
    this.playMotif('flower');
    this.rampLayer('harmony', 0.07, 1.2);
    setTimeout(() => this.restoreStateLayers(1.5), 600);
  }

  onEnvelope(): void {
    this.playMotif('envelope');
    this.transitionTo('memory', 1.8);
  }

  onSecretDiscovery(): void {
    this.transitionTo('secret', 2.5);
    setTimeout(() => this.restoreStateLayers(2), 1200);
  }

  enterHeart(): void {
    this.preloadFinale();
    this.transitionTo('heart', 2.8);
  }

  onHeartAttach(type: string): void {
    this.heartAttachCount += 1;
    const motif = heartTypeToMotif(type);
    this.playMotif(motif);
    this.playMotif('heart', 0.65);

    const warmth = Math.min(0.14, 0.04 + this.heartAttachCount * 0.015);
    this.rampLayer('emotional', (STATE_LAYER_TARGETS.heart.emotional ?? 0.1) + warmth, 1.8);
    this.rampLayer('pulse', (STATE_LAYER_TARGETS.heart.pulse ?? 0.05) + warmth * 0.3, 1.2);
  }

  onHeartComplete(): void {
    this.clearHeartComplete();
    this.transitionTo('silence', 1.2);
    this.heartCompleteTimer = setTimeout(() => {
      this.playResolveChord();
      this.transitionTo('heart', 2);
    }, 1600);
  }

  enterRemembers(): void {
    this.transitionTo('remembers', 3.2);
  }

  onHeartObjectRemembered(type: string): void {
    const motif = heartTypeToMotif(type);
    this.playMotif(motif, 0.75);
    this.playMotif('heart', 0.5);
  }

  onReconstructionComplete(): void {
    this.playResolveChord(0.85);
    setTimeout(() => this.transitionTo('silence', 2), 2200);
  }

  onFinalePhase(phase: FinaleMusicalPhase | string): void {
    if (phase === 'idle') return;
    const mapping = finalePhaseMusical(phase as FinaleMusicalPhase);
    if (mapping.dip) {
      this.dipToNearSilence(1.2);
      return;
    }
    if (mapping.state) {
      this.transitionTo(mapping.state, STATE_CROSSFADE_SEC[mapping.state] ?? 2.5);
    }
    if (mapping.motif) {
      this.playMotif(mapping.motif, 0.7);
    }
  }

  onConvergenceProgress(progress: number): void {
    const t = Math.max(0, Math.min(1, progress));
    const base = STATE_LAYER_TARGETS.transformation.finale ?? 0.085;
    const target = 0.1 + t * 0.12;
    this.rampLayer('finale', base + target, 0.35);
    this.musicIntensity.set(0.58 + t * 0.28);
  }

  giantHeartReveal(): void {
    this.transitionTo('giant_heart', 4);
    this.playResolveChord(1);
  }

  onHerName(): void {
    this.rampLayer('finale', 0.14, 2);
    this.rampLayer('emotional', 0.09, 2);
    this.musicIntensity.set(0.72);
  }

  onFinalMessage(): void {
    this.rampLayer('finale', 0.1, 2.5);
    this.rampLayer('emotional', 0.11, 2.5);
    this.musicIntensity.set(0.55);
  }

  beginLetter(): void {
    this.transitionTo('letter', 2.5);
  }

  beginSecret(): void {
    this.transitionTo('silence', 2);
    setTimeout(() => this.transitionTo('secret', 2.5), 800);
  }

  onSecretReveal(): void {
    this.playMotif('secret', 0.9);
  }

  onTinyHeart(): void {
    this.playMotif('heart', 1.1);
  }

  endExperience(): void {
    this.transitionTo('ending', 4);
    this.musicIntensity.set(0);
  }

  /** Delegate one-shot cues (used by SoundDesignService). */
  playMotif(id: MotifKind, volumeScale = 1): void {
    if (!this.canPlay()) return;
    const ctx = this.ensureContext();
    const preset = MOTIF_PRESETS[id];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.master!);

    const now = ctx.currentTime;
    const vol = preset.vol * volumeScale * this.intensityScale();
    osc.type = preset.type;
    osc.frequency.setValueAtTime(preset.freq, now);
    if (preset.detune) osc.detune.setValueAtTime(preset.detune, now);
    osc.frequency.exponentialRampToValueAtTime(preset.freq * 1.35, now + preset.dur * 0.45);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.dur);

    osc.start(now);
    osc.stop(now + preset.dur + 0.06);
  }

  getAudioContext(): AudioContext | undefined {
    return this.ctx ?? undefined;
  }

  // ——— Internal ———

  private transitionTo(state: MusicalState, durationSec?: number): void {
    const duration = durationSec ?? STATE_CROSSFADE_SEC[state] ?? 2.5;
    const scale = this.intensityScale();
    const targets = STATE_LAYER_TARGETS[state];
    const next = this.zeroLayers();

    for (const layer of Object.keys(next) as MusicLayerId[]) {
      next[layer] = (targets[layer] ?? 0) * scale;
    }

    this.musicalState.set(state);
    this.musicIntensity.set(STATE_INTENSITY[state] * scale);
    this.beginCrossfade(next, duration);
  }

  private beginCrossfade(targets: Record<MusicLayerId, number>, durationSec: number): void {
    const ctx = this.ensureContext();
    this.startLayers();

    for (const layer of Object.keys(this.currentLayerGains) as MusicLayerId[]) {
      this.crossfadeStart[layer] = this.currentLayerGains[layer];
    }

    this.targetLayerGains = { ...targets };
    this.crossfadeFrom = ctx.currentTime;
    this.crossfadeDuration = Math.max(0.05, durationSec);
    this.crossfadeEndAt = this.crossfadeFrom + this.crossfadeDuration;

    cancelAnimationFrame(this.crossfadeRaf);
    this.crossfadeRaf = requestAnimationFrame(() => this.tickCrossfade());
  }

  private tickCrossfade(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const t = this.crossfadeDuration <= 0
      ? 1
      : Math.min(1, (now - this.crossfadeFrom) / this.crossfadeDuration);
    const eased = 1 - Math.pow(1 - t, 2.2);

    for (const layer of Object.keys(this.currentLayerGains) as MusicLayerId[]) {
      const from = this.crossfadeStart[layer];
      const to = this.targetLayerGains[layer];
      const value = from + (to - from) * eased;
      this.currentLayerGains[layer] = value;
      const nodes = this.layers.get(layer);
      if (nodes) {
        nodes.gain.gain.setTargetAtTime(value * LAYER_BASE_GAIN[layer], now, 0.08);
      }
    }

    if (t < 1) {
      this.crossfadeRaf = requestAnimationFrame(() => this.tickCrossfade());
    }
  }

  private rampLayer(layer: MusicLayerId, target: number, durationSec: number): void {
    const nodes = this.layers.get(layer);
    if (!nodes || !this.ctx) return;
    this.currentLayerGains[layer] = target;
    nodes.gain.gain.setTargetAtTime(
      target * LAYER_BASE_GAIN[layer],
      this.ctx.currentTime,
      Math.max(0.05, durationSec * 0.35)
    );
  }

  private restoreStateLayers(durationSec: number): void {
    const state = this.musicalState();
    const targets = STATE_LAYER_TARGETS[state];
    const next = this.zeroLayers();
    const scale = this.intensityScale();
    for (const layer of Object.keys(next) as MusicLayerId[]) {
      next[layer] = (targets[layer] ?? 0) * scale;
    }
    this.beginCrossfade(next, durationSec);
  }

  private dipToNearSilence(durationSec: number): void {
    const next = this.zeroLayers();
    next.universe = 0.008 * this.intensityScale();
    this.beginCrossfade(next, durationSec);
    this.musicIntensity.set(0.04);
  }

  private playResolveChord(volumeScale = 1): void {
    if (!this.canPlay()) return;
    const ctx = this.ensureContext();
    const freqs = [261.63, 329.63, 392];
    const now = ctx.currentTime;
    const vol = 0.028 * volumeScale * this.intensityScale();

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      gain.connect(this.master!);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
      osc.start(now);
      osc.stop(now + 3);
    }
  }

  private preloadFinale(): void {
    if (this.preFinalePreloaded) return;
    this.preFinalePreloaded = true;
    // Warm up finale layer oscillators ahead of transformation.
    this.startLayers();
    this.rampLayer('finale', 0.01, 0.01);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyMasterGain();
      this.buildLayers();
    }
    return this.ctx;
  }

  private buildLayers(): void {
    const ctx = this.ctx!;
    const master = this.master!;

    for (const layerId of Object.keys(LAYER_OSCILLATORS) as MusicLayerId[]) {
      const layerGain = ctx.createGain();
      layerGain.gain.value = 0;
      layerGain.connect(master);
      this.layers.set(layerId, { gain: layerGain, oscillators: [], started: false });
    }

    // Subtle pulse LFO on pulse layer
    const pulseNodes = this.layers.get('pulse')!;
    this.pulseLfo = ctx.createOscillator();
    this.pulseLfoGain = ctx.createGain();
    this.pulseLfo.frequency.value = 0.85;
    this.pulseLfoGain.gain.value = 0.35;
    this.pulseLfo.connect(this.pulseLfoGain);
    this.pulseLfoGain.connect(pulseNodes.gain.gain);
    this.pulseLfo.start();
  }

  private startLayers(): void {
    if (this.layersStarted || !this.ctx) return;
    this.layersStarted = true;

    for (const [layerId, spec] of Object.entries(LAYER_OSCILLATORS) as [
      MusicLayerId,
      (typeof LAYER_OSCILLATORS)[MusicLayerId]
    ][]) {
      const nodes = this.layers.get(layerId);
      if (!nodes || nodes.started) continue;

      for (const oscSpec of spec) {
        const osc = this.ctx.createOscillator();
        osc.type = oscSpec.type;
        osc.frequency.value = oscSpec.freq;
        if (oscSpec.detune) osc.detune.value = oscSpec.detune;
        osc.connect(nodes.gain);
        osc.start();
        nodes.oscillators.push(osc);
      }
      nodes.started = true;
    }
  }

  private applyMasterGain(): void {
    if (!this.master || !this.ctx) return;
    let gain = this.musicVolume;
    if (this.userMuted || this.tabHidden) gain = 0;
    this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.06);
  }

  private canPlay(): boolean {
    return this.enabled() && !this.userMuted && !this.motion.prefersReducedMotion();
  }

  private intensityScale(): number {
    return this.motion.prefersReducedMotion() ? 0.55 : 1;
  }

  private zeroLayers(): Record<MusicLayerId, number> {
    return {
      universe: 0,
      harmony: 0,
      pulse: 0,
      memory: 0,
      emotional: 0,
      finale: 0,
      secret: 0
    };
  }

  private clearTimers(): void {
    if (this.memoryExitTimer) clearTimeout(this.memoryExitTimer);
    if (this.heartCompleteTimer) clearTimeout(this.heartCompleteTimer);
    if (this.dipTimer) clearTimeout(this.dipTimer);
    this.memoryExitTimer = null;
    this.heartCompleteTimer = null;
    this.dipTimer = null;
  }

  private clearMemoryExit(): void {
    if (this.memoryExitTimer) {
      clearTimeout(this.memoryExitTimer);
      this.memoryExitTimer = null;
    }
  }

  private clearHeartComplete(): void {
    if (this.heartCompleteTimer) {
      clearTimeout(this.heartCompleteTimer);
      this.heartCompleteTimer = null;
    }
  }

  private dispose(): void {
    cancelAnimationFrame(this.crossfadeRaf);
    this.clearTimers();

    for (const nodes of this.layers.values()) {
      for (const osc of nodes.oscillators) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          /* already stopped */
        }
      }
      nodes.gain.disconnect();
    }

    this.pulseLfo?.stop();
    this.pulseLfo?.disconnect();
    this.pulseLfoGain?.disconnect();
    this.master?.disconnect();

    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.layers.clear();
    this.layersStarted = false;
  }
}
