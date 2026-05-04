/** @vitest-environment jsdom */
import { useEffect, useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpModal } from '@/components/ui/HelpModal';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import {
  isTypingTarget,
  shouldAllowMapArrowPan,
  isInsideAriaModal,
} from '@/lib/hooks/keyboardNavGuards';

afterEach(() => {
  cleanup();
});

describe('isTypingTarget', () => {
  it('returns true for input', () => {
    const el = document.createElement('input');
    expect(isTypingTarget(el)).toBe(true);
  });

  it('returns true for textarea', () => {
    const el = document.createElement('textarea');
    expect(isTypingTarget(el)).toBe(true);
  });

  it('returns true for contenteditable', () => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    expect(isTypingTarget(el)).toBe(true);
  });

  it('returns true for element inside contenteditable', () => {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const inner = document.createElement('span');
    root.appendChild(inner);
    expect(isTypingTarget(inner)).toBe(true);
  });

  it('returns false for div', () => {
    expect(isTypingTarget(document.createElement('div'))).toBe(false);
  });

  it('returns false for button', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
  });

  it('returns false for document.body', () => {
    expect(isTypingTarget(document.body)).toBe(false);
  });
});

describe('isInsideAriaModal', () => {
  it('returns true inside aria-modal', () => {
    const d = document.createElement('div');
    d.setAttribute('aria-modal', 'true');
    const b = document.createElement('button');
    d.appendChild(b);
    expect(isInsideAriaModal(b)).toBe(true);
  });
});

describe('shouldAllowMapArrowPan', () => {
  it('returns false for ArrowLeft when target is input', () => {
    const input = document.createElement('input');
    expect(shouldAllowMapArrowPan({ key: 'ArrowLeft', target: input })).toBe(false);
  });

  it('returns true for ArrowLeft when target is body', () => {
    expect(shouldAllowMapArrowPan({ key: 'ArrowLeft', target: document.body })).toBe(true);
  });

  it('returns true for non-arrow keys regardless of target', () => {
    const input = document.createElement('input');
    expect(shouldAllowMapArrowPan({ key: 'a', target: input })).toBe(true);
  });
});

function TrapHarness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  return open ? (
    <div ref={ref} role="dialog" aria-modal="true">
      <button type="button">first</button>
      <button type="button">second</button>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ) : null;
}

describe('useFocusTrap', () => {
  it('cycles Tab forward within the trap', async () => {
    const user = userEvent.setup();
    render(<TrapHarness open onClose={() => {}} />);
    const first = screen.getByRole('button', { name: 'first' });
    const second = screen.getByRole('button', { name: 'second' });
    expect(document.activeElement).toBe(first);
    await user.tab();
    expect(document.activeElement).toBe(second);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'close' }));
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it('cycles Shift+Tab backward within the trap', async () => {
    const user = userEvent.setup();
    render(<TrapHarness open onClose={() => {}} />);
    const first = screen.getByRole('button', { name: 'first' });
    const closeBtn = screen.getByRole('button', { name: 'close' });
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('returns focus to the opener on close', async () => {
    const user = userEvent.setup();
    function Fixture() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" data-testid="opener" onClick={() => setOpen(true)}>
            open
          </button>
          <TrapHarness open={open} onClose={() => setOpen(false)} />
        </>
      );
    }
    render(<Fixture />);
    const opener = screen.getByTestId('opener');
    await user.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
    await user.click(screen.getByRole('button', { name: 'close' }));
    expect(document.activeElement).toBe(opener);
  });
});

describe('HelpModal keyboard', () => {
  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<HelpModal open onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', bubbles: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops Escape from reaching window listeners', () => {
    const winSpy = vi.fn();
    window.addEventListener('keydown', winSpy);
    const onClose = vi.fn();
    render(<HelpModal open onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', bubbles: true });
    expect(winSpy).not.toHaveBeenCalled();
    window.removeEventListener('keydown', winSpy);
  });

  it('moves focus to first focusable on open and restores on close', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" data-testid="help-opener" onClick={() => setOpen(true)}>
            HELP
          </button>
          <HelpModal open={open} onClose={() => setOpen(false)} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByTestId('help-opener');
    await user.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close help' }));
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });
});

function LayerToggleMirror() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || isInsideAriaModal(e.target)) return;
      if (e.key === '1') setCount((c) => c + 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <>
      <input data-testid="field" defaultValue="" />
      <span data-testid="count">{count}</span>
    </>
  );
}

describe('Layer toggle guard (mirrors TacticalMap)', () => {
  it('increments when keydown target is body', () => {
    render(<LayerToggleMirror />);
    fireEvent.keyDown(document.body, { key: '1', bubbles: true });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('does not increment when target is input', () => {
    render(<LayerToggleMirror />);
    const input = screen.getByTestId('field');
    input.focus();
    const ev = new KeyboardEvent('keydown', { key: '1', bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, configurable: true });
    window.dispatchEvent(ev);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
