'use client';

import {
  Component,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
  isValidElement,
  cloneElement,
  Fragment,
} from 'react';

export type ErrorBoundaryFallback =
  | ReactNode
  | ((error: Error, retry: () => void) => ReactNode);

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ErrorBoundaryFallback;
  onError?: (error: Error, errorInfo?: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  resetKey: number;
}

export function SignalLost({
  label,
  onRetry,
}: {
  label: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[8rem] gap-3 p-4 text-center"
      role="alert"
    >
      <div className="text-[10px] font-mono tracking-widest text-tactical-text-dim/80 uppercase">
        [{label}]
      </div>
      <div className="text-xs font-mono tracking-wide text-tactical-text-dim">
        SIGNAL LOST — DATA FEED UNAVAILABLE
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 text-[10px] font-mono tracking-wider text-terminal-amber/90 border border-terminal-amber/40 px-3 py-1 hover:bg-terminal-amber/10 focus-visible:ring-1 focus-visible:ring-terminal-amber/50"
        >
          RETRY
        </button>
      ) : null}
    </div>
  );
}

function injectRetryIntoSignalLost(fallback: ReactNode, retry: () => void): ReactNode {
  if (isValidElement(fallback) && fallback.type === SignalLost) {
    return cloneElement(fallback as ReactElement<{ label: string; onRetry?: () => void }>, {
      onRetry: retry,
    });
  }
  return fallback;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Pick<ErrorBoundaryState, 'error'> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private retry = (): void => {
    this.setState((prev) => ({
      error: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  render(): ReactNode {
    const { error, resetKey } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.retry);
      }
      return injectRetryIntoSignalLost(fallback, this.retry);
    }

    return <Fragment key={resetKey}>{children}</Fragment>;
  }
}
