/**
 * True when the event target is a control where digit keys, arrows, or Esc
 * should not run map / global shortcuts.
 */
function contentEditableAttrTrue(el: Element): boolean {
  const v = el.getAttribute('contenteditable');
  if (v === 'true' || v === '' || v === 'plaintext-only') return true;
  if (el instanceof HTMLElement) {
    const ce = el.contentEditable;
    if (ce === 'true' || ce === 'plaintext-only') return true;
  }
  return false;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  if (contentEditableAttrTrue(el)) return true;
  let ancestor: Element | null = el.parentElement;
  while (ancestor) {
    if (contentEditableAttrTrue(ancestor)) return true;
    ancestor = ancestor.parentElement;
  }
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return false;
}

/** True when focus is inside an open aria-modal dialog (e.g. help). */
export function isInsideAriaModal(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[aria-modal="true"]'));
}

/** Arrow-key map pan should run only when this returns true (MapLibre parity for gating). */
export function shouldAllowMapArrowPan(e: Pick<KeyboardEvent, 'target' | 'key'>): boolean {
  const k = e.key;
  if (k !== 'ArrowUp' && k !== 'ArrowDown' && k !== 'ArrowLeft' && k !== 'ArrowRight') return true;
  if (isTypingTarget(e.target)) return false;
  if (isInsideAriaModal(e.target)) return false;
  return true;
}
