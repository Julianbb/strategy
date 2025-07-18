"use client"

import { ChartRadialShape } from "@/components/radial-chart"

interface DualChartRadialProps {
  total_1: number
  current_1: number
  total_2: number
  current_2: number
  title_1: string
  description_1: string
  title_2: string
  description_2: string
}

export function DualChartRadial({ total_1, current_1, total_2, current_2, title_1, description_1, title_2, description_2 }: DualChartRadialProps) {
  return (
    <div className="w-full grid grid-cols-2 gap-4">
      <ChartRadialShape
        title={title_1}
        description={description_1}
        total_number={total_1}
        current_number={current_1}
      />
      <ChartRadialShape
        title={title_2}
        description={description_2}
        total_number={total_2}
        current_number={current_2}
      />
    </div>
  )
}