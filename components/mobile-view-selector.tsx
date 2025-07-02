'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type MobileView = 'chat' | 'summary' | 'trades';

interface MobileViewSelectorProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
}

export function MobileViewSelector({ activeView, onViewChange }: MobileViewSelectorProps) {
  const views: { key: MobileView; label: string }[] = [
    { key: 'chat', label: 'Chat' },
    { key: 'summary', label: 'Summary' },
    { key: 'trades', label: 'Trades' }
  ];

  return (
    <div className="flex md:hidden sticky top-0 z-40 bg-background border-b">
      <div className="flex w-full">
        {views.map((view) => (
          <Button
            key={view.key}
            variant={activeView === view.key ? 'default' : 'ghost'}
            className="flex-1 rounded-none border-0"
            onClick={() => onViewChange(view.key)}
          >
            {view.label}
          </Button>
        ))}
      </div>
    </div>
  );
}