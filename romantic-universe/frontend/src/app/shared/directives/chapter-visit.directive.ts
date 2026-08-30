import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject, input } from '@angular/core';
import { ExperienceControllerService } from '../../core/experience/experience-controller.service';
import { DirectorChapterId } from '../../core/experience/experience-state.types';

@Directive({
  selector: '[appChapterVisit]',
  standalone: true
})
export class ChapterVisitDirective implements OnInit, OnDestroy {
  readonly appChapterVisit = input.required<DirectorChapterId, string | number>({
    transform: (value) => Number(value) as DirectorChapterId
  });

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly controller = inject(ExperienceControllerService);
  private readonly ngZone = inject(NgZone);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.28) {
          this.ngZone.run(() => {
            this.controller.visitChapter(this.appChapterVisit());
          });
        }
      },
      { threshold: [0.28, 0.45], rootMargin: '0px 0px -15% 0px' }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
