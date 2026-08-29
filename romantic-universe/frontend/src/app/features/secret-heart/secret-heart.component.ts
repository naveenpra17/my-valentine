import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { EasterEggService } from '../../core/services/easter-egg.service';
import { MotionService } from '../../core/services/motion.service';
import { FocusTrapService } from '../../core/services/focus-trap.service';
import { MusicalChoreographyService } from '../../core/audio/musical-choreography.service';
import { SoundDesignService } from '../../core/services/sound-design.service';

@Component({
  selector: 'app-secret-heart',
  standalone: true,
  templateUrl: './secret-heart.component.html',
  styleUrl: './secret-heart.component.scss'
})
export class SecretHeartComponent implements OnDestroy {
  readonly secretMessage = input(
    'You found the secret heart. That means you\'re officially the most curious, wonderful person I know.'
  );

  @ViewChild('modal') modalRef?: ElementRef<HTMLElement>;

  private readonly easterEggs = inject(EasterEggService);
  private readonly motion = inject(MotionService);
  private readonly focusTrap = inject(FocusTrapService);
  private readonly music = inject(MusicalChoreographyService);
  private readonly sounds = inject(SoundDesignService);

  readonly showModal = signal(false);

  constructor() {
    effect(() => {
      if (this.showModal()) {
        requestAnimationFrame(() => {
          const el = this.modalRef?.nativeElement;
          if (el) {
            this.focusTrap.activate(el, () => this.close());
          }
        });
      } else {
        this.focusTrap.deactivate();
      }
    });
  }

  get discoveredCount(): number {
    return this.easterEggs.discoveredCount();
  }

  get heartFound(): boolean {
    return this.easterEggs.secretHeartFound();
  }

  reveal(): void {
    this.easterEggs.markSecretHeartFound();
    this.showModal.set(true);
    this.sounds.enable();
    this.music.onSecretDiscovery();

    if (!this.motion.prefersReducedMotion()) {
      requestAnimationFrame(() => {
        gsap.from('.secret-heart__card', {
          opacity: 0,
          scale: 0.9,
          y: 20,
          filter: 'blur(8px)',
          duration: 0.8,
          ease: 'power3.out'
        });
      });
    }
  }

  close(): void {
    this.showModal.set(false);
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
  }
}
