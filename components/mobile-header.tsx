'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export type MobileView = 'chat' | 'summary' | 'trades';

interface MobileHeaderProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
}

export function MobileHeader({ activeView, onViewChange }: MobileHeaderProps) {
  const router = useRouter();
  
  const views: { key: MobileView; label: string }[] = [
    { key: 'chat', label: 'Chat' },
    { key: 'summary', label: 'Summary' },
    { key: 'trades', label: 'Trades' }
  ];

  return (
    <header className="flex md:hidden sticky top-0 z-40 bg-background border-b">
      <div className="flex items-center justify-between w-full px-4 py-2">
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="p-2"
          onClick={() => router.push("/dashboard/chat")}
        >
          <ChevronLeft className="size-12" />
        </Button>
        
        {/* Mobile View Selector */}
        <div className="flex justify-center mx-4">
          <div className="flex bg-muted rounded-lg p-1">
            {views.map((view) => (
              <Button
                key={view.key}
                variant={activeView === view.key ? 'default' : 'ghost'}
                size="sm"
                className="px-3 py-1 text-xs"
                onClick={() => onViewChange(view.key)}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Spacer to balance the layout */}
        <div className="w-8" />
        
      </div>
    </header>
  );
}