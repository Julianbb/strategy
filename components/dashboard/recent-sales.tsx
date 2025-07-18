import { Badge } from '@/components/ui/badge'
import { StrategyChat } from '@/lib/db/schema'
import { calculateDaysSinceStarted } from '@/lib/utils'

interface RecentSalesProps {
  strategies: StrategyChat[]
}

export function RecentSales({ strategies }: RecentSalesProps) {

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'stopped':
        return 'destructive'
      case 'completed':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <div className='space-y-8'>
      {strategies.map((strategy) => {
        const duration = calculateDaysSinceStarted(strategy)
        
        return (
          <div key={strategy.id} className='flex items-center gap-4'>
            <Badge variant={getStatusVariant(strategy.status)} className='capitalize'>
              {strategy.status}
            </Badge>
            <div className='flex flex-1 flex-wrap items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm leading-none font-medium'>{strategy.strategyName}</p>
                <p className='text-muted-foreground text-sm'>
                  {duration} {duration === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div className='font-medium'>
                {strategy.profit_loss ? `$${Number(strategy.profit_loss).toLocaleString()}` : 'N/A'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}