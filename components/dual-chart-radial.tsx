"use client"

import { ChartRadialShape } from "./chart-radial-shape"

interface DualChartRadialProps {
  total_1: number
  current_1: number
  total_2: number
  current_2: number
}

export function DualChartRadial({ total_1, current_1, total_2, current_2 }: DualChartRadialProps) {
  return (
    <div className="h-2/5 grid grid-cols-2 gap-4 py-4 px-6">
      <ChartRadialShape
        title="Chart 1"
        description="First chart metrics"
        total_number={total_1}
        current_number={current_1}
      />
      <ChartRadialShape
        title="Chart 2"
        description="Second chart metrics"
        total_number={total_2}
        current_number={current_2}
      />
    </div>
  )
}