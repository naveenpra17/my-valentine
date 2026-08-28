import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Scroll-triggered reveal that won't leave content stuck invisible. */
export function revealOnScroll(
  target: gsap.TweenTarget,
  vars: gsap.TweenVars,
  scrollTrigger?: ScrollTrigger.Vars
): ScrollTrigger | undefined {
  const tween = gsap.from(target, {
    ...vars,
    immediateRender: false,
    scrollTrigger: {
      once: true,
      toggleActions: 'play none none none',
      ...scrollTrigger
    }
  });

  return tween.scrollTrigger ?? undefined;
}

/** Call after async content mounts so triggers measure correctly. */
export function finalizeScrollReveal(...elements: Element[]): void {
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        gsap.set(el, { opacity: 1, y: 0, x: 0, scale: 1, filter: 'none', clearProps: 'transform' });
      }
    }
  });
}
