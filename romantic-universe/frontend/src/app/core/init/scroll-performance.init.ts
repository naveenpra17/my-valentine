import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initScrollPerformance(): void {
  if (typeof window === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true
  });
  gsap.ticker.lagSmoothing(500, 33);
}
