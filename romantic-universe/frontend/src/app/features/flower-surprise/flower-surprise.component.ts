import { Component, inject, input, signal } from '@angular/core';
import gsap from 'gsap';
import { MotionService } from '../../core/services/motion.service';

@Component({
  selector: 'app-flower-surprise',
  standalone: true,
  templateUrl: './flower-surprise.component.html',
  styleUrl: './flower-surprise.component.scss'
})
export class FlowerSurpriseComponent {
  readonly flowerMessage = input('Every day with you feels like spring arrived early.');

  private readonly motion = inject(MotionService);

  readonly bloomed = signal(false);
  readonly showMessage = signal(false);

  bloom(): void {
    if (this.bloomed()) return;
    this.bloomed.set(true);

    if (!this.motion.prefersReducedMotion()) {
      setTimeout(() => this.showMessage.set(true), 800);
    } else {
      this.showMessage.set(true);
    }
  }
}
