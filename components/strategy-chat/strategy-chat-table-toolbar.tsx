import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { strategyStatusTypes, baseCurrencies } from './data'
import { DataTableFacetedFilter } from '@/components/strategy-chat/strategy-chat-data-table-faceted-filter'
import { DataTableViewOptions } from '@/components/strategy-chat/strategy-chat-data-table-view-options'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function StrategyChatTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        <Input
          placeholder='Filter strategies...'
          value={
            (table.getColumn('strategyName')?.getFilterValue() as string) ?? ''
          }
          onChange={(event) =>
            table.getColumn('strategyName')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        <div className='flex gap-x-2'>
          {table.getColumn('status') && (
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title='Status'
              options={strategyStatusTypes.map((status) => ({
                label: status.label,
                value: status.value,
                icon: status.icon,
              }))}
            />
          )}
          {table.getColumn('baseCurrency') && (
            <DataTableFacetedFilter
              column={table.getColumn('baseCurrency')}
              title='Base Currency'
              options={baseCurrencies}
            />
          )}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <Cross2Icon className='ml-2 size-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}