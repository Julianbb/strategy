'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface OverviewProps {
  data: Array<{
    name: string
    total: number
    fill?: string
  }>
  onBarClick?: (data: any) => void
}

export function Overview({ data, onBarClick }: OverviewProps) {

  return (
    <div style={{ outline: 'none' }} className="focus:outline-none [&_*]:focus:outline-none [&_*]:outline-none" tabIndex={-1}>
      <ResponsiveContainer width='100%' height={350}>
        <BarChart data={data} onClick={onBarClick}>
          <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value) => [`$${value}`, 'Total']}
          labelFormatter={(label) => `Month: ${label}`}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--card-foreground))'
          }}
        />
        <Bar
          dataKey='total'
          radius={[4, 4, 0, 0]}
          className='cursor-pointer'
        />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}