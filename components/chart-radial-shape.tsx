"use client"

import { TrendingUp } from "lucide-react"
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"

export const description = "A radial chart with a custom shape"

interface ChartRadialShapeProps {
  title: string
  description: string
  total_number: number
  current_number: number
}

export function ChartRadialShape({ title, description, total_number, current_number }: ChartRadialShapeProps) {
  const chartData = [
    { browser: "safari", visitors: current_number || 0, fill: "var(--color-safari)" },
  ]

  const chartConfig = {
    visitors: {
      label: "Current",
    },
    safari: {
      label: "Safari",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-start pb-2 flex-shrink-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs text-left">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex items-center justify-center">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[100px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={180}
            endAngle={180 - (total_number ? (current_number / total_number) * 360 : 0)}
            innerRadius={40}
            outerRadius={56}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[42, 34]}
            />
            <RadialBar dataKey="visitors" background />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {(current_number || 0).toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          of {(total_number || 0).toLocaleString()}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
