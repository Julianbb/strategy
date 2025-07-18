import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface DashboardCardProps {
  title: string
  value: string
  icon: React.ReactNode
  description?: string
}

export function DashboardCard({ title, value, icon, description }: DashboardCardProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {description && (
          <p className='text-muted-foreground text-xs'>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}