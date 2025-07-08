'use client';

import { useState } from 'react';
import { StrategyCard } from '@/components/strategy-summary-card';
import { ChartAreaInteractive } from '@/components/strategy-line-chart';
import { DataTable } from '@/components/strategy-trades-sheets';
import { FloatingChat } from '@/components/floating-chat';
import { MobileChat } from '@/components/mobile-chat';
import { MobileHeader, type MobileView } from '@/components/mobile-header';
import type { UIMessage } from 'ai';
import type { Session } from 'next-auth';

interface MobileChatLayoutProps {
  strategyChat: any;
  tradesInCurrentStrategy: any[];
  chatId: string;
  initialMessages: UIMessage[];
  initialChatModel: string;
  isReadonly: boolean;
  session: Session;
}

export function MobileChatLayout({
  strategyChat,
  tradesInCurrentStrategy,
  chatId,
  initialMessages,
  initialChatModel,
  isReadonly,
  session
}: MobileChatLayoutProps) {
  const [activeView, setActiveView] = useState<MobileView>('chat');

  return (
    <div className=''>
      {/* Mobile header with view selector - only visible on mobile */}
      <MobileHeader activeView={activeView} onViewChange={setActiveView} />
      
      {/* Mobile content - only show selected view on mobile */}
      <div className="flex flex-1 flex-col">
        {/* Mobile views */}
        <div className="md:hidden flex flex-1 flex-col">
          {activeView === 'chat' && (
            <div className="flex flex-1 flex-col">
              <MobileChat
                id={chatId}
                initialMessages={initialMessages}
                initialChatModel={initialChatModel}
                isReadonly={isReadonly}
                session={session}
                autoResume={true}
              />
            </div>
          )}
          
          {activeView === 'summary' && (
            <div className="@container/main flex flex-1 flex-col gap-2 overflow-auto">
              <div className="flex flex-col gap-4 p-4">
                <StrategyCard strategyChat={strategyChat} tradesInCurrentStrategy={tradesInCurrentStrategy} />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive strategyChat={strategyChat} />
                </div>
              </div>
            </div>
          )}
          
          {activeView === 'trades' && (
            <div className="@container/main flex flex-1 flex-col gap-2 overflow-auto w-full max-w-full">
              <div className="flex flex-col gap-4 py-4 w-full max-w-full overflow-hidden">
                <DataTable tradesInCurrentStrategy={tradesInCurrentStrategy} baseCurrency={strategyChat?.baseCurrency} />
              </div>
            </div>
          )}
        </div>

        {/* Desktop view - show all content as before */}
        <div className="hidden md:flex md:flex-1 md:flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 w-full max-w-full">
            <div className="flex flex-col gap-4 md:gap-6 w-full max-w-full">
              <StrategyCard strategyChat={strategyChat} tradesInCurrentStrategy={tradesInCurrentStrategy} />
              <ChartAreaInteractive strategyChat={strategyChat} />
              <div className="w-full max-w-full overflow-hidden">
                <DataTable tradesInCurrentStrategy={tradesInCurrentStrategy} baseCurrency={strategyChat?.baseCurrency} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FloatingChat - only show on desktop */}
      <div className="hidden md:flex">
        <FloatingChat
          id={chatId}
          initialMessages={initialMessages}
          initialChatModel={initialChatModel}
          isReadonly={isReadonly}
          session={session}
          autoResume={true}
        />
      </div>
    </div>
  );
}