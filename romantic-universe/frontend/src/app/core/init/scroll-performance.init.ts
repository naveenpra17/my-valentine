import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initScrollPerformance(): void {
  if (typeof window === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: false
  });
  gsap.ticker.lagSmoothing(500, 33);

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => ScrollTrigger.refresh(), 300);
  });
}
