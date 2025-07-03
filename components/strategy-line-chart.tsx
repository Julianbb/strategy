"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Line, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { StrategyChat } from "@/lib/db/schema"

export const description = "An interactive area chart"

type ChartData = {
  date: string;
  value: number;
};

const chartConfig = {
  value: {
    label: "Strategy Value",
    color: "var(--primary)",
  },
} satisfies ChartConfig



function downsampleByStep(data: ChartData[], step: number) {
  return data.filter((_, index) => index % step === 0)
}



export function ChartAreaInteractive({ strategyChat }: { strategyChat?: StrategyChat }) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [chartData, setChartData] = React.useState<ChartData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  React.useEffect(() => {
    const fetchData = async () => {
      if (!strategyChat?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        let daysBack = 90
        if (timeRange === "30d") {
          daysBack = 30
        } else if (timeRange === "7d") {
          daysBack = 7
        }

        const response = await fetch(`/api/snapshot?strategyChatId=${strategyChat.id}&daysBack=${daysBack}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch strategy snapshots')
        }

        let interval = 3
        if (timeRange === "30d") interval = 6
        else if (timeRange === "90d") interval = 30
        
        const rawData = await response.json()
        const formattedData: ChartData[] = downsampleByStep(rawData, interval)

        setChartData(formattedData)
        
      } catch (error) {
        console.error('Error fetching strategy snapshots:', error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [strategyChat?.id, timeRange])

  const filteredData = chartData

  const values = filteredData.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1
  const yDomain: [number, number] = [min - padding, max + padding]
  

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Value Of Strategy</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Value of Strategy since created date.
          </span>
          <span className="@[540px]/card:hidden">Value of Strategy since created date.</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
          style={{ minWidth: '300px', minHeight: '250px' }}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground">Loading chart data...</div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground">No data available for the selected period</div>
            </div>
          ) : (
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <YAxis 
                domain={yDomain} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                width={70}
                tickFormatter={(value) => Number(value).toFixed(2)} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "Asia/Bangkok"

                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={isMobile ? -1 : 10}
                content={
                  <ChartTooltipContent
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }).format(date)
                  }}                             
                    formatter={(value) => [
                      `$${parseFloat(value as string).toFixed(2)}`
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="value"
                type="natural"
                fill="url(#fillValue)"
                stroke="var(--color-value)"
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
