import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { type Trades as TradesType } from "@/lib/db/schema"

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
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(date)
}



export default function TradeCard({ trade, baseCurrency }: { trade: TradesType, baseCurrency: string }) {
    const currencyType = trade.productType === 'option' ? 'currency' : 'usd'
    const currency = trade.productType === 'option' ? baseCurrency : undefined
    const price = trade.productType === 'option' ? trade.priceInCurrency : trade.priceInUSD
    const fee = trade.productType === 'option' ? trade.feeInCurrency : trade.feeInUSD
  
    return (
      <div className="px-4 py-3 text-sm">
        {/* 第一排：Product + Side */}
        <div className="flex items-center space-x-2">
          <div className="font-semibold">{trade.product}</div>
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 ${
              trade.side === 'buy'
                ? 'border-green-500 text-green-700 dark:text-green-400'
                : 'border-red-500 text-red-700 dark:text-red-400'
            }`}
          >
            {trade.side.toUpperCase()}
          </Badge>
        </div>
  
        {/* 第二排：Price + Amount */}
        <div className="flex justify-between font-mono mt-5"> {/* 👈 更大间隔 */}
          <div>Price: {formatCurrency(price, currencyType, currency)}</div>
          <div>Amt: {parseFloat(trade.amount).toFixed(2)}</div>
        </div>
  
        {/* 第三排：Fee + Time */}
        <div className="flex justify-between font-mono text-xs text-muted-foreground mt-3"> {/* 👈 正常间隔 */}
          <div>Fee: {formatCurrency(fee, currencyType, currency)}</div>
          <div>{formatDateTime(trade.executedAt)}</div>
        </div>
      </div>
    )
  }
  
  