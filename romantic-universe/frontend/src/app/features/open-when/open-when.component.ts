import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { OpenWhenMessage } from '../../core/models';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-open-when',
  standalone: true,
  templateUrl: './open-when.component.html',
  styleUrl: './open-when.component.scss'
})
export class OpenWhenComponent implements OnInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChildren('envelope') envelopeRefs!: QueryList<ElementRef<HTMLElement>>;

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);

  readonly messages = signal<OpenWhenMessage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly openedId = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      this.envelopeRefs.changes.subscribe(() => this.initScrollAnimations());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getOpenWhenMessages());
      this.messages.set(data);
    } catch {
      this.error.set('Could not load messages.');
    } finally {
      this.loading.set(false);
      setTimeout(() => this.initScrollAnimations(), 100);
    }
  }

  openEnvelope(id: number): void {
    if (this.openedId() === id) {
      this.openedId.set(null);
      return;
    }
    this.openedId.set(id);
  }

  isOpen(id: number): boolean {
    return this.openedId() === id;
  }

  private initScrollAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    const envelopes = this.envelopeRefs?.toArray() ?? [];
    gsap.from(envelopes.map(e => e.nativeElement), {
      scrollTrigger: {
        trigger: this.sectionRef.nativeElement,
        start: 'top 75%'
      },
      opacity: 0,
      y: 30,
      rotate: -3,
      stagger: 0.08,
      duration: 0.7,
      ease: 'power3.out'
    });
  }
}
