import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy
} from '@angular/core';
import { MotionService } from '../../core/services/motion.service';

@Directive({
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(MotionService);

  readonly tiltIntensity = input(12);

  private rafId = 0;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.motion.prefersReducedMotion()) return;
    this.applyTilt(event.clientX, event.clientY);
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (this.motion.prefersReducedMotion()) return;
    const touch = event.touches[0];
    if (touch) this.applyTilt(touch.clientX, touch.clientY);
  }

  @HostListener('mouseleave')
  @HostListener('touchend')
  onLeave(): void {
    cancelAnimationFrame(this.rafId);
    const el = this.el.nativeElement;
    el.style.transform = '';
    el.style.transition = 'transform 0.4s ease';
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private applyTilt(clientX: number, clientY: number): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const el = this.el.nativeElement;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const intensity = this.tiltIntensity();

      const rotateX = ((y - centerY) / centerY) * -intensity;
      const rotateY = ((x - centerX) / centerX) * intensity;

      el.style.transition = 'transform 0.1s ease';
      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
  }
}
