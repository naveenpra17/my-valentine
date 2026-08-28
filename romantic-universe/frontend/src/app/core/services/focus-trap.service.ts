import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FocusTrapService {
  private activeRoot: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private keyHandler?: (event: KeyboardEvent) => void;

  activate(root: HTMLElement, onEscape?: () => void): void {
    this.deactivate();
    this.activeRoot = root;
    this.previousFocus = document.activeElement as HTMLElement | null;

    this.keyHandler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (event.key === 'Tab') {
        this.handleTab(event, root);
      }
    };

    document.addEventListener('keydown', this.keyHandler);

    requestAnimationFrame(() => {
      const focusable = this.getFocusable(root);
      (focusable[0] ?? root).focus();
    });
  }

  deactivate(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }

    if (this.previousFocus?.focus) {
      this.previousFocus.focus();
    }

    this.activeRoot = null;
    this.previousFocus = null;
  }

  private getFocusable(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
  }

  private handleTab(event: KeyboardEvent, root: HTMLElement): void {
    const focusable = this.getFocusable(root);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
