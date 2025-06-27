import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StrategyMetric {
  title: string
  value: string
  changePercentage: number
  direction: 'up' | 'down'
}

interface StrategyCardProps {
  metrics?: StrategyMetric[]
}

export function StrategyCard({ metrics = defaultMetrics }: StrategyCardProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-12 px-4 py-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Strategy Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-12">
          {metrics.map((metric, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
              <p className="text-2xl font-bold">{metric.value}</p>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  metric.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.changePercentage > 0 ? '+' : ''}{metric.changePercentage}%
                </span>
                <Badge className={`flex items-center space-x-1 ${
                  metric.direction === 'up' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                  {metric.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{metric.direction === 'up' ? 'Up' : 'Down'}</span>
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

const defaultMetrics: StrategyMetric[] = [
  {
    title: "Total Cost",
    value: "$12,450",
    changePercentage: -2.5,
    direction: 'down'
  },
  {
    title: "Total Profit",
    value: "$3,280",
    changePercentage: 8.2,
    direction: 'up'
  },
  {
    title: "Win Rate",
    value: "67%",
    changePercentage: 1.5,
    direction: 'up'
  },
  {
    title: "ROI",
    value: "26.3%",
    changePercentage: 3.8,
    direction: 'up'
  }
]