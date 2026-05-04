/** @vitest-environment jsdom */
import { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ErrorBoundary, SignalLost } from '@/components/layout/ErrorBoundary';

afterEach(() => {
  cleanup();
});

function Thrower({ message = 'boom' }: { message?: string }) {
  throw new Error(message);
}

function ThrowOnAttempt({ attempt }: { attempt: number }) {
  if (attempt === 0) throw new Error('first-mount');
  return <span data-testid="recovered">recovered</span>;
}

function RenderPropHarness() {
  const [attempt, setAttempt] = useState(0);
  return (
    <ErrorBoundary
      fallback={(err, retry) => (
        <button type="button" onClick={() => { setAttempt(1); retry(); }}>
          fix:{err.message}
        </button>
      )}
    >
      <ThrowOnAttempt attempt={attempt} />
    </ErrorBoundary>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary fallback={<SignalLost label="X" />}>
        <span>ok-child</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('ok-child')).toBeTruthy();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary fallback={<SignalLost label="MAP" />}>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('SIGNAL LOST — DATA FEED UNAVAILABLE')).toBeTruthy();
    expect(screen.getByText('[MAP]')).toBeTruthy();
  });

  it('calls onError with the thrown error', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary fallback={<span>down</span>} onError={onError}>
        <Thrower message="expected-msg" />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe('expected-msg');
  });

  it('isolates errors between sibling boundaries', () => {
    render(
      <div>
        <ErrorBoundary fallback={<span>left-down</span>}>
          <Thrower />
        </ErrorBoundary>
        <ErrorBoundary fallback={<span>right-down</span>}>
          <span>right-ok</span>
        </ErrorBoundary>
      </div>
    );
    expect(screen.getByText('left-down')).toBeTruthy();
    expect(screen.getByText('right-ok')).toBeTruthy();
    expect(screen.queryByText('right-down')).toBeNull();
  });

  it('re-mounts children when reset via retry (SignalLost element fallback + cloneElement onRetry)', () => {
    function ArmCloneHarness() {
      const [armed, setArmed] = useState(false);
      function Child() {
        if (!armed) throw new Error('fail');
        return <span data-testid="recovered">recovered</span>;
      }
      return (
        <div>
          <button type="button" data-testid="arm-success" onClick={() => setArmed(true)}>
            arm
          </button>
          <ErrorBoundary fallback={<SignalLost label="INTEL FEED" />}>
            <Child />
          </ErrorBoundary>
        </div>
      );
    }
    render(<ArmCloneHarness />);
    expect(screen.getByText('SIGNAL LOST — DATA FEED UNAVAILABLE')).toBeTruthy();
    fireEvent.click(screen.getByTestId('arm-success'));
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(screen.getByTestId('recovered')).toBeTruthy();
    expect(screen.queryByText('SIGNAL LOST — DATA FEED UNAVAILABLE')).toBeNull();
  });

  it('supports fallback render function with retry', () => {
    render(<RenderPropHarness />);
    expect(screen.getByRole('button', { name: /fix:first-mount/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /fix:first-mount/ }));
    expect(screen.getByTestId('recovered')).toBeTruthy();
  });
});

describe('SignalLost', () => {
  it('renders the label prop', () => {
    render(<SignalLost label="CUSTOM-LABEL" />);
    expect(screen.getByText('[CUSTOM-LABEL]')).toBeTruthy();
    expect(screen.getByText('SIGNAL LOST — DATA FEED UNAVAILABLE')).toBeTruthy();
  });

  it('renders RETRY when onRetry is passed', () => {
    const onRetry = vi.fn();
    render(<SignalLost label="L" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'RETRY' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
