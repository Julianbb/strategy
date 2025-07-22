'use client'

import { StrategyChat } from '@/lib/db/schema'
import { calculateDaysSinceStarted } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface MonthStrategiesProps {
  strategies: StrategyChat[]
}

export function MonthStrategies({ strategies }: MonthStrategiesProps) {
  const router = useRouter();

  const handleStrategyClick = (strategyId: string) => {
    router.push(`/dashboard/strategy-chat/${strategyId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="size-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'paused':
        return (
          <div className="size-6 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
            <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'stopped':
        return (
          <div className="size-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'completed':
        return (
          <div className="size-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
            <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="size-6 rounded-full bg-gray-500 flex items-center justify-center shrink-0">
            <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        )
    }
  }

  return (
    <div className='space-y-3 md:space-y-4 max-h-60 md:max-h-80 overflow-y-auto pr-1 md:pr-2'>
      {strategies.map((strategy) => {
        const duration = calculateDaysSinceStarted(strategy)
        
        return (
          <div 
            key={strategy.id} 
            className='flex items-center gap-2 md:gap-4 cursor-pointer hover:bg-muted/50 p-2 md:p-3 rounded-md transition-colors'
            onClick={() => handleStrategyClick(strategy.id)}
          >
            {getStatusIcon(strategy.status)}
            <div className='flex-1 min-w-0'>
              <p className='text-xs md:text-sm font-medium truncate'>{strategy.strategyName}</p>
              <p className='text-muted-foreground text-xs'>
                {duration}d
              </p>
            </div>
            <div className='font-medium text-xs md:text-sm text-right shrink-0'>
              {strategy.last_profit_loss ? `$${Number(strategy.last_profit_loss).toLocaleString()}` : 'N/A'}
            </div>
          </div>
        )
      })}
    </div>
  )
}