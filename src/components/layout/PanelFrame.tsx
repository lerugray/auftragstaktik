'use client';

import { ReactNode } from 'react';

interface PanelFrameProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function PanelFrame({ title, children, className = '' }: PanelFrameProps) {
  return (
    <div
      className={`bg-tactical-panel border border-tactical-border flex flex-col overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-tactical-border bg-tactical-surface/50">
        <span className="w-1 h-4 bg-terminal-green/60 rounded-sm" />
        <h2 className="text-sm font-mono text-terminal-green/80 tracking-widest uppercase">
          {title}
        </h2>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
