"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


import {type Trades as TradesType } from '@/lib/db/schema'



const formatCurrency = (value: string | null, currencyType: 'currency' | 'usd', baseCurrency?: string): string => {
  if (!value) return '-'
  const num = parseFloat(value)
  if (currencyType === 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(num)
  }
  const formatted = parseFloat(num.toFixed(8)).toString()
  return baseCurrency ? `${formatted} ${baseCurrency}` : formatted
}

const formatDateTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const createTradeColumns = (baseCurrency: string): ColumnDef<TradesType>[] => [
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.product}
      </div>
    ),
  },
  {
    accessorKey: "side",
    header: "Side",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`px-2 py-1 ${
          row.original.side === 'buy'
            ? 'border-green-500 text-green-700 dark:text-green-400'
            : 'border-red-500 text-red-700 dark:text-red-400'
        }`}
      >
        {row.original.side.toUpperCase()}
      </Badge>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => {
      const { productType, priceInCurrency, priceInUSD } = row.original
      const price = productType === 'option' ? priceInCurrency : priceInUSD
      const currencyType = productType === 'option' ? 'currency' : 'usd'
      const currency = productType === 'option' ? baseCurrency : undefined
      return (
        <div className="text-right font-mono">
          {formatCurrency(price, currencyType, currency)}
        </div>
      )
    },
  },
  {
    accessorKey: "fee",
    header: () => <div className="text-right">Fee</div>,
    cell: ({ row }) => {
      const { productType, feeInCurrency, feeInUSD } = row.original
      const fee = productType === 'option' ? feeInCurrency : feeInUSD
      const currencyType = productType === 'option' ? 'currency' : 'usd'
      const currency = productType === 'option' ? baseCurrency : undefined
      return (
        <div className="text-right font-mono">
          {formatCurrency(fee, currencyType, currency)}
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {parseFloat(row.original.amount).toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "executedAt",
    header: "Executed Time",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDateTime(row.original.executedAt)}
      </div>
    ),
  },
]


export function DataTable({
  tradesInCurrentStrategy,
  baseCurrency,
}: {
  tradesInCurrentStrategy: TradesType[]
  baseCurrency: string
}) {
  const [data] = React.useState(() => tradesInCurrentStrategy)
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns: createTradeColumns(baseCurrency),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  })

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="relative flex flex-col gap-4 px-4 lg:px-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={createTradeColumns(baseCurrency).length}
                    className="h-24 text-center"
                  >
                    No trades found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

