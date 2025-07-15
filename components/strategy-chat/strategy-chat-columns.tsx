'use client'

import { ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import LongText from '@/components/long-text'
import { statusColorMap } from './data'
import { StrategyChat } from './schema'
import { DataTableColumnHeader } from '@/components/strategies/data-table-column-header'
import { StrategyChatRowActions } from './strategy-chat-row-actions'

export const columns: ColumnDef<StrategyChat>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      </div>
    ),
    meta: {
      className: cn(
        'sticky md:table-cell left-0 z-10 rounded-tl',
        'bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted'
      ),
    },
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='ID' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-20'>{row.getValue('id')}</LongText>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)] lg:drop-shadow-none',
        'bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
        'sticky left-6 md:table-cell'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'strategyName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-40'>{row.getValue('strategyName')}</LongText>
    ),
    meta: { className: 'w-40' },
  },
  {
    accessorKey: 'baseCurrency',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Base Currency' />
    ),
    cell: ({ row }) => (
      <div className='font-mono'>{row.getValue('baseCurrency')}</div>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'initialCapital_USD',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Initial Capital (USD)' />
    ),
    cell: ({ row }) => {
      const amount = row.getValue('initialCapital_USD') as string | null
      if (!amount) return <div className='font-mono text-muted-foreground'>-</div>
      return <div className='font-mono'>${parseFloat(amount).toLocaleString()}</div>
    },
  },
  {
    accessorKey: 'initialCapital_Currency',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Initial Capital (Currency)' />
    ),
    cell: ({ row }) => {
      const amount = row.getValue('initialCapital_Currency') as string | null
      const currency = row.getValue('baseCurrency') as string
      if (!amount) return <div className='font-mono text-muted-foreground'>-</div>
      return <div className='font-mono'>{parseFloat(amount).toLocaleString()} {currency}</div>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const badgeColor = statusColorMap.get(status)
      
      return (
        <Badge variant='outline' className={cn('capitalize', badgeColor)}>
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'totalTrades',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Trades' />
    ),
    cell: ({ row }) => {
      const trades = row.getValue('totalTrades') as string
      return <div className='font-mono'>{parseInt(trades).toLocaleString()}</div>
    },
  },
  {
    accessorKey: 'startedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Started At' />
    ),
    cell: ({ row }) => {
      const date = row.getValue('startedAt') as Date
      return <div className='font-mono'>{date.toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'endedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Ended At' />
    ),
    cell: ({ row }) => {
      const date = row.getValue('endedAt') as Date | null
      return <div className='font-mono'>{date ? date.toLocaleDateString() : '-'}</div>
    },
  },
  {
    id: 'actions',
    cell: StrategyChatRowActions,
  },
]