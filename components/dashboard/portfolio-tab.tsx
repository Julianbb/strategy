import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DashboardCard } from '@/components/dashboard/dashboard-card'

export function PortfolioTab() {
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <DashboardCard
          title="Portfolio Value"
          value="$125,456.78"
          description="+15.3% from last month"
          icon={
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground size-4'
            >
              <path d='M3 3v18h18' />
              <path d='M18.7 8l-5.1 5.2-2.8-2.7L7 14.3' />
            </svg>
          }
        />
        <DashboardCard
          title="Holdings"
          value="23"
          description="5 new positions"
          icon={
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground size-4'
            >
              <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
              <circle cx='9' cy='7' r='4' />
              <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
            </svg>
          }
        />
        <DashboardCard
          title="Allocation"
          value="78%"
          description="Equity allocation"
          icon={
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground size-4'
            >
              <path d='M21.21 15.89A10 10 0 1 1 8 2.83' />
              <path d='M22 12A10 10 0 0 0 12 2v10z' />
            </svg>
          }
        />
        <DashboardCard
          title="Daily Change"
          value="+$2,340"
          description="+1.87% today"
          icon={
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground size-4'
            >
              <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
            </svg>
          }
        />
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent className='pl-2'>
            <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
              Portfolio performance chart will be implemented here
            </div>
          </CardContent>
        </Card>
        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Top Holdings</CardTitle>
            <CardDescription>
              Your largest portfolio positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium'>AAPL</div>
                  <div className='text-sm text-muted-foreground'>Apple Inc.</div>
                </div>
                <div className='text-right'>
                  <div className='font-medium'>$12,456</div>
                  <div className='text-sm text-green-600'>+2.3%</div>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium'>MSFT</div>
                  <div className='text-sm text-muted-foreground'>Microsoft Corp.</div>
                </div>
                <div className='text-right'>
                  <div className='font-medium'>$10,234</div>
                  <div className='text-sm text-green-600'>+1.8%</div>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium'>GOOGL</div>
                  <div className='text-sm text-muted-foreground'>Alphabet Inc.</div>
                </div>
                <div className='text-right'>
                  <div className='font-medium'>$8,901</div>
                  <div className='text-sm text-red-600'>-0.5%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}