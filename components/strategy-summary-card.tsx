"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {DualChartRadial} from "@/components/dual-chart-radial"
import { HelpCircle } from "lucide-react"
import { useEffect, useState } from 'react';

import {StrategyChat as StrategyChatType, Trades} from "@/lib/db/schema"
import { calculateStrategyMetrics } from "@/lib/calculation/strategy_summary"
import { fetchPrices } from "@/lib/3party/okxapi"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StrategyMetric {
  title: string
  value: string
  isToolTipNeed: boolean
  tipMessage?: string
  currency?: string
  usd?: string
}

interface StrategyCardProps {
  strategyChat: StrategyChatType
  tradesInCurrentStrategy: Trades[]
}




export function StrategyCard({ strategyChat, tradesInCurrentStrategy }: StrategyCardProps) {
  const [currencyPrice, setCurrencyPrice] = useState<number | null>(null);
  const [optionsPrice, setOptionsPrice] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function updatePrices() {
      try {
        if (!strategyChat.baseCurrency) return;
        
        // Use the same options instrument ID as in the original code
        const { spotPrice, optionPrice } = await fetchPrices(
          strategyChat.baseCurrency, 
          'ETH-USD-250725-2100-P'
        );
        
        if (spotPrice !== null) {
          setCurrencyPrice(spotPrice);
        }
        
        if (optionPrice !== null) {
          setOptionsPrice(optionPrice);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    updatePrices();
    const interval = setInterval(updatePrices, 10000);
    return () => clearInterval(interval);
  }, [strategyChat.baseCurrency]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const calculatedMetrics = calculateStrategyMetrics(
    strategyChat, 
    isLoaded ? currencyPrice : null, 
    isLoaded ? optionsPrice : null,
    tradesInCurrentStrategy
  );

  const metrics: StrategyMetric[] = [
    {
      title: "Allocation",
      value: isLoaded ? `$${calculatedMetrics.allocationInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0",
      isToolTipNeed: true,
      tipMessage: "Total capital allocated to this strategy (updated with live price)",
      currency: strategyChat.initialCapital_Currency ? `${Number(strategyChat.initialCapital_Currency).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${strategyChat.baseCurrency}` : undefined,
      usd: strategyChat.initialCapital_USD ? `$${Number(strategyChat.initialCapital_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined
    },
    {
      title: "Total Fee",
      value: isLoaded ? `$${calculatedMetrics.totalFeeInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0",
      isToolTipNeed: true,
      tipMessage: "Total cost including fees and initial investment (updated with live price)",
      currency: isLoaded ? `${calculatedMetrics.totalFee_Currency.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${strategyChat.baseCurrency}` : `0 ${strategyChat.baseCurrency}`,
      usd: isLoaded ? `$${calculatedMetrics.totalFee_USD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0"
    },
    {
      title: "Current Value",
      value: isLoaded ? `$${calculatedMetrics.currentValueInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0",
      isToolTipNeed: true,
      tipMessage: "Current market value of the strategy"
    },
    {
      title: "P&L",
      value: isLoaded ? `$${calculatedMetrics.profitLossInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0",
      isToolTipNeed: true,
      tipMessage: "Profit and Loss from current position"
    },
    {
      title: "APR",
      value: isLoaded ? `${calculatedMetrics.apr.toFixed(1)}%` : "0%",
      isToolTipNeed: true,
      tipMessage: "Annual Percentage Rate - annualized return based on time elapsed"
    }
  ]


  return (
    <div className='flex justify-between'>
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-12 px-4 py-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Strategy Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-8">
          {metrics.map((metric, index) => (
            <div key={index} className="flex flex-col items-center space-y-2 min-w-[120px]">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
                {metric.isToolTipNeed && metric.tipMessage && (
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{metric.tipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-2xl font-bold text-center w-full">{metric.value}</p>
              {(metric.currency || metric.usd) && (
                <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground font-medium justify-center w-full">
                  {metric.currency && <span>{metric.currency}</span>}
                  {metric.usd && <span>{metric.usd}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
   
    </div>
     <DualChartRadial
     total_1={calculatedMetrics.positionSizeOptions ? Number(calculatedMetrics.positionSizeOptions) : 0}
     current_1={calculatedMetrics.positionSizeOptions ? Number(calculatedMetrics.positionSizeOptions) : 0}
     total_2={calculatedMetrics.positionSizeOptions ? Number(calculatedMetrics.positionSizeOptions) : 0}
     current_2={calculatedMetrics.positionSizePerpetual ? Number(calculatedMetrics.positionSizePerpetual) : 0}
     title_1="Options"
     description_1="Current options position size"
     title_2="Perpetual"
     description_2="Current perpetual position size"
     />
   </div>

  )
}
