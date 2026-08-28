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
import { Reason } from '../../core/models';
import { TiltDirective } from '../../shared/directives/tilt.directive';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-reasons',
  standalone: true,
  imports: [TiltDirective],
  templateUrl: './reasons.component.html',
  styleUrl: './reasons.component.scss'
})
export class ReasonsComponent implements OnInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChildren('reasonCard') cardRefs!: QueryList<ElementRef<HTMLElement>>;

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);

  readonly reasons = signal<Reason[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expandedId = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      this.cardRefs.changes.subscribe(() => this.initScrollAnimations());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getReasons());
      this.reasons.set(data);
    } catch {
      this.error.set('Could not load reasons.');
    } finally {
      this.loading.set(false);
      setTimeout(() => this.initScrollAnimations(), 100);
    }
  }

  toggleReason(id: number): void {
    this.expandedId.update(current => (current === id ? null : id));
  }

  isExpanded(id: number): boolean {
    return this.expandedId() === id;
  }

  private initScrollAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    const cards = this.cardRefs?.toArray() ?? [];
    gsap.from(cards.map(c => c.nativeElement), {
      scrollTrigger: {
        trigger: this.sectionRef.nativeElement,
        start: 'top 75%'
      },
      opacity: 0,
      y: 40,
      scale: 0.95,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out'
    });
  }
}
