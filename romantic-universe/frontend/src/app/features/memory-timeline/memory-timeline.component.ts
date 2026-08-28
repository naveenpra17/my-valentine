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
import { DatePipe } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MotionService } from '../../core/services/motion.service';
import { Memory } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-memory-timeline',
  standalone: true,
  imports: [DatePipe, ModalComponent],
  templateUrl: './memory-timeline.component.html',
  styleUrl: './memory-timeline.component.scss'
})
export class MemoryTimelineComponent implements OnInit {
  @ViewChild('section') sectionRef!: ElementRef<HTMLElement>;
  @ViewChildren('memoryCard') cardRefs!: QueryList<ElementRef<HTMLElement>>;

  private readonly api = inject(ApiService);
  private readonly motion = inject(MotionService);

  readonly memories = signal<Memory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Memory | null>(null);
  readonly imageErrors = signal<Set<number>>(new Set());

  constructor() {
    afterNextRender(() => {
      this.cardRefs.changes.subscribe(() => this.initScrollAnimations());
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.api.getMemories());
      this.memories.set(data);
    } catch {
      this.error.set('Could not load memories.');
    } finally {
      this.loading.set(false);
      setTimeout(() => this.initScrollAnimations(), 100);
    }
  }

  openMemory(memory: Memory): void {
    this.selected.set(memory);
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.selected.set(null);
    document.body.style.overflow = '';
  }

  onImageError(id: number): void {
    this.imageErrors.update(set => new Set(set).add(id));
  }

  hasImageError(id: number): boolean {
    return this.imageErrors().has(id);
  }

  private initScrollAnimations(): void {
    if (this.motion.prefersReducedMotion() || !this.sectionRef) return;

    const cards = this.cardRefs?.toArray() ?? [];
    cards.forEach((card, i) => {
      gsap.from(card.nativeElement, {
        scrollTrigger: {
          trigger: card.nativeElement,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 50,
        rotate: i % 2 === 0 ? -2 : 2,
        duration: 0.9,
        ease: 'power3.out'
      });
    });
  }
}
