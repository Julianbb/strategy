"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {DualChartRadial} from "@/components/dual-chart-radial"
import { HelpCircle } from "lucide-react"
import { useEffect, useState } from 'react';

import {StrategyChat as StrategyChatType} from "@/lib/db/schema"
import { calculateStrategyMetrics } from "@/lib/calculation/strategy_summary"
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
}




export function StrategyCard({ strategyChat }: StrategyCardProps) {
  const [currencyPrice, setCurrencyPrice] = useState<number | null>(null);
  const [optionsPrice, setOptionsPrice] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchPrices() {
      try {
        if (!strategyChat.baseCurrency) return;
        
        const instId = `${strategyChat.baseCurrency}-USDT`;
        const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
        const data = await res.json();
        
        if (data.data && data.data[0]) {
          setCurrencyPrice(data.data[0].last);
        }
        
        // For now, set options price same as currency price
        // This can be updated with actual options pricing API
        if (data.data && data.data[0]) {
          setOptionsPrice(45);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, [strategyChat.baseCurrency]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const calculatedMetrics = calculateStrategyMetrics(
    strategyChat, 
    isLoaded ? currencyPrice : null, 
    isLoaded ? optionsPrice : null
  );

  const metrics: StrategyMetric[] = [
    {
      title: "Allocation",
      value: isLoaded ? `$${calculatedMetrics.allocationInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0",
      isToolTipNeed: true,
      tipMessage: "Total capital allocated to this strategy (updated with live price)",
      currency: strategyChat.initialCapital_Currency ? `${Number(strategyChat.initialCapital_Currency).toLocaleString()} ${strategyChat.baseCurrency}` : undefined,
      usd: strategyChat.initialCapital_USD ? `$${Number(strategyChat.initialCapital_USD).toLocaleString()}` : undefined
    },
    {
      title: "Total Cost",
      value: isLoaded ? `$${calculatedMetrics.totalCostInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0",
      isToolTipNeed: true,
      tipMessage: "Total cost including fees and initial investment (updated with live price)",
      currency: strategyChat.totalCost_Currency ? `${Number(strategyChat.totalCost_Currency).toLocaleString()} ${strategyChat.baseCurrency}` : undefined,
      usd: strategyChat.totalCost_USD ? `$${Number(strategyChat.totalCost_USD).toLocaleString()}` : undefined
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium justify-center w-full">
                  {metric.currency && <span>{metric.currency}</span>}
                  {metric.currency && metric.usd && <span>|</span>}
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
     total_1={strategyChat.positionSize_Options ? Number(strategyChat.positionSize_Options) : 0}
     current_1={strategyChat.positionSize_Options ? Number(strategyChat.positionSize_Options) : 0}
     total_2={strategyChat.positionSize_Options ? Number(strategyChat.positionSize_Options) : 0}
     current_2={strategyChat.positionSize_Perpetual ? Number(strategyChat.positionSize_Perpetual) : 0}
     title_1="Options"
     description_1="Current options position size"
     title_2="Perpetual"
     description_2="Current perpetual position size"
     />
   </div>

  )
}
