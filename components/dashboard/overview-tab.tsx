import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Overview } from '@/components/dashboard/overview'

const constructChartData = (strategies: StrategyChat[]) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthlyData = months.map(month => ({ name: month, total: 0, fill: '#22c55e' }));
  
  strategies.forEach(strategy => {
    const createdMonth = new Date(strategy.startedAt).getMonth();
    const profitAndLoss = strategy.profit_loss ? Number(strategy.profit_loss) : 0;
    monthlyData[createdMonth].total += profitAndLoss;
  });
  
  // Set colors based on total value
  monthlyData.forEach(month => {
    month.fill = month.total >= 0 ? '#22c55e' : '#ef4444'; // green for positive, red for negative
  });
  
  return monthlyData;
};
import { MonthStrategies } from '@/components/dashboard/month-strategies'
import { DashboardCard } from '@/components/dashboard/dashboard-card'
import { StrategyChat } from '@/lib/db/schema'
import { useState } from 'react'

interface OverviewTabProps {
  strategies: StrategyChat[]
}

export function OverviewTab({ strategies = [] }: OverviewTabProps) {
  const currentMonth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date().getMonth()];
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const chartData = constructChartData(strategies);
  
  const getStrategiesForMonth = (monthName: string) => {
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthName);
    return strategies.filter(strategy => {
      const createdMonth = new Date(strategy.startedAt).getMonth();
      return createdMonth === monthIndex;
    });
  };
  
  const displayedStrategies = getStrategiesForMonth(selectedMonth);
  
  // Calculate total P&L from all strategies
  const totalProfitLoss = strategies.reduce((sum, strategy) => {
    const profitLoss = strategy.profit_loss ? Number(strategy.profit_loss) : 0;
    return sum + profitLoss;
  }, 0);
  
  // Calculate active strategies count
  const activeStrategiesCount = strategies.filter(strategy => strategy.status === 'active').length;

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <DashboardCard
          title="Total Value"
          value="$45,231.89"
          description="+20.1% from last month"
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
        <DashboardCard
          title="P&L"
          value={`${totalProfitLoss >= 0 ? '+' : ''}$${totalProfitLoss.toLocaleString()}`}
          description="profit and loss of total strategies"
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
          title="Strategies"
          value={strategies.length.toString()}
          description="Total strategies created"
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
              <rect width='20' height='14' x='2' y='5' rx='2' />
              <path d='M2 10h20' />
            </svg>
          }
        />
        <DashboardCard
          title="Active Now"
          value={activeStrategiesCount.toString()}
          description="Currently active strategies"
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
              <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
            </svg>
          }
        />
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className='pl-2'>
            <Overview 
              data={chartData} 
              onBarClick={(data) => {
                const monthName = data.activeLabel;
                setSelectedMonth(monthName);
              }} 
            />
          </CardContent>
        </Card>
        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Strategies</CardTitle>
            <CardDescription>
              {`You excuted ${displayedStrategies.length} strategies in ${selectedMonth}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayedStrategies.length > 0 ? (
              <MonthStrategies strategies={displayedStrategies} />
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>No strategies found for this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}