'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  });
}

/**
 * Traps Tab / Shift+Tab inside `containerRef` while `isOpen`, moves focus to the
 * first focusable on open, restores focus to the previously focused element on close.
 * Does not handle Escape — keep that on the modal/dialog component.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isOpen: boolean): void {
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      const prev = lastFocusedRef.current;
      lastFocusedRef.current = null;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
      return;
    }

    const prev = document.activeElement;
    lastFocusedRef.current = prev instanceof HTMLElement ? prev : null;

    const container = containerRef.current;
    if (!container) return;

    const focusables = getFocusableElements(container);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      if (!container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
      }
      container.focus();
    }
  }, [isOpen, containerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!active || !container.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, containerRef]);
}
