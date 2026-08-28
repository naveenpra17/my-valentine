import { Injectable, computed, inject, signal } from '@angular/core';
import { ExperienceStateService } from '../experience/experience-state.service';

@Injectable({ providedIn: 'root' })
export class EasterEggService {
  private readonly experienceState = inject(ExperienceStateService);
  readonly secretHeartFound = signal(
    localStorage.getItem('egg_secret_heart') === 'true'
  );
  readonly voidWhisperFound = signal(
    localStorage.getItem('egg_void_whisper') === 'true'
  );
  readonly hiddenStarFound = signal(
    localStorage.getItem('egg_hidden_star') === 'true'
  );
  readonly titleClicked = signal(
    localStorage.getItem('egg_title_click') === 'true'
  );

  readonly showVoidWhisper = signal(false);
  readonly voidWhisperMessage = signal('');

  readonly discoveredCount = computed(() => {
    let count = 0;
    if (this.secretHeartFound()) count++;
    if (this.voidWhisperFound()) count++;
    if (this.hiddenStarFound()) count++;
    if (this.titleClicked()) count++;
    return count;
  });

  private keyBuffer = '';
  private listenerAttached = false;

  initHiddenWorld(): void {
    if (this.listenerAttached || typeof document === 'undefined') return;
    document.addEventListener('keydown', this.onKeyDown);
    this.listenerAttached = true;
  }

  destroyHiddenWorld(): void {
    if (!this.listenerAttached || typeof document === 'undefined') return;
    document.removeEventListener('keydown', this.onKeyDown);
    this.listenerAttached = false;
  }

  markSecretHeartFound(): void {
    localStorage.setItem('egg_secret_heart', 'true');
    this.secretHeartFound.set(true);
    this.experienceState.discoverSecret('secret-heart');
  }

  markVoidWhisperFound(): void {
    localStorage.setItem('egg_void_whisper', 'true');
    this.voidWhisperFound.set(true);
    this.experienceState.discoverSecret('void-whisper');
  }

  markHiddenStarFound(): void {
    localStorage.setItem('egg_hidden_star', 'true');
    this.hiddenStarFound.set(true);
    this.experienceState.discoverSecret('hidden-star');
  }

  markTitleClicked(): void {
    localStorage.setItem('egg_title_click', 'true');
    this.titleClicked.set(true);
    this.experienceState.discoverSecret('title-click');
  }

  triggerVoidWhisper(message?: string): void {
    if (this.voidWhisperFound()) return;
    if (message) this.voidWhisperMessage.set(message);
    this.markVoidWhisperFound();
    this.showVoidWhisper.set(true);
  }

  dismissVoidWhisper(): void {
    this.showVoidWhisper.set(false);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

    this.keyBuffer = (this.keyBuffer + event.key.toLowerCase()).slice(-4);
    if (this.keyBuffer === 'love' && !this.voidWhisperFound()) {
      this.triggerVoidWhisper();
    }
  };
}
