'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { HelpCircle, MoreHorizontal, Play, Pause, Square, CheckCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import {StrategyChat as StrategyChatType, Trades} from "@/lib/db/schema"
import { calculateStrategyMetrics } from "@/lib/services/calculator/strategy-metrics-service.client"
import { CalculateStrategyMetricsType } from "@/lib/services/calculator/strategy-metrics"
import { statusColorMap } from "./data"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
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
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculateStrategyMetricsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'stopped' | 'completed') => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/strategy-chat', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: strategyChat.id,
          status: newStatus,
        }),
      })

      if (response.ok) {
        
        toast.success('Strategy status updated successfully')
        
        // If status changed to stopped or completed, recalculate metrics
        if (newStatus === 'stopped' || newStatus === 'completed') {
          try {
            // Update the strategyChat object with new status
            const updatedStrategyChat = { ...strategyChat, status: newStatus }
            const recalculatedMetrics = await calculateStrategyMetrics(
              updatedStrategyChat, 
              tradesInCurrentStrategy
            )
            setCalculatedMetrics(recalculatedMetrics)
          } catch (error) {
            console.error('Failed to recalculate metrics:', error)
          }
        }
        
        // Update the local strategyChat object to reflect the new status
        strategyChat.status = newStatus
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Failed to update strategy status')
      }
    } catch (error) {
      console.error('Failed to update strategy status:', error)
      toast.error('Failed to update strategy status')
    } finally {
      setIsUpdating(false)
    }
  }
  
  useEffect(() => {
    async function fetchMetrics(isInitial = false) {
      try {
        if (isInitial) {
          setIsLoading(true);
        }
        const metrics = await calculateStrategyMetrics(
          strategyChat, 
          tradesInCurrentStrategy
        );
        setCalculatedMetrics(metrics);
      } catch (error) {
        console.error('Failed to calculate strategy metrics:', error);
      } finally {
        if (isInitial) {
          setIsLoading(false);
        }
      }
    }
    
    // Initial fetch with loading state
    fetchMetrics(true);
    
    // Set up interval to refresh every 10 seconds (without loading state)
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 10000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [strategyChat, tradesInCurrentStrategy]);


  if (isLoading || !calculatedMetrics) {
    return <div>Loading strategy metrics...</div>;
  }

  const metrics: StrategyMetric[] = [
    {
      title: "Allocation",
      value: `$${calculatedMetrics.allocationInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isToolTipNeed: true,
      tipMessage: "Total capital allocated to this strategy (updated with live price)",
      currency: strategyChat.initialCapital_Currency ? `${Number(strategyChat.initialCapital_Currency).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${strategyChat.baseCurrency}` : undefined,
      usd: strategyChat.initialCapital_USD ? `$${Number(strategyChat.initialCapital_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined
    },
    {
      title: "Total Fee",
      value: `$${calculatedMetrics.totalFeeInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isToolTipNeed: true,
      tipMessage: "Total cost including fees and initial investment (updated with live price)",
      
    },
    {
      title: "Current Value",
      value: `$${calculatedMetrics.currentValueInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isToolTipNeed: true,
      tipMessage: "Current market value of the strategy",
      currency: (strategyChat.status === 'completed' || strategyChat.status === 'stopped') && strategyChat.lastCapital_Currency 
        ? `${Number(strategyChat.lastCapital_Currency).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${strategyChat.baseCurrency}` 
        : undefined,
      usd: (strategyChat.status === 'completed' || strategyChat.status === 'stopped') && strategyChat.lastCapital_USD 
        ? `$${Number(strategyChat.lastCapital_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
        : undefined
    },
    {
      title: "P&L",
      value: `$${calculatedMetrics.profitLossInUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isToolTipNeed: true,
      tipMessage: "Profit and Loss from current position"
    },
    {
      title: "APR",
      value: `${calculatedMetrics.apr.toFixed(1)}%`,
      isToolTipNeed: true,
      tipMessage: "Annual Percentage Rate - annualized return based on time elapsed"
    }
  ]


  return (
    <div className="">
      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col lg:flex-row lg:justify-between gap-6 lg:items-stretch">
        {/* Strategy Summary Card */}
        <div className="flex-1 lg:flex-[2] min-w-0">
          <Card className="@container/card h-full">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  Strategy Summary
                  <span className="text-sm font-normal text-muted-foreground">
                    ({calculatedMetrics.daysSinceStarted} {calculatedMetrics.daysSinceStarted === 1 ? 'day' : 'days'})
                  </span>
                 
                    <span className={`text-sm font-medium px-2 py-1 rounded border capitalize ${
                      statusColorMap.get(strategyChat.status) || 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {strategyChat.status}
                    </span>
                </div>
                
                {/* Status Change Dropdown - Hidden for completed strategies */}
                {strategyChat.status !== 'completed' && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        className='data-[state=open]:bg-muted flex size-8 p-0'
                        disabled={isUpdating}
                      >
                        <MoreHorizontal className='size-4' />
                        <span className='sr-only'>Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-[160px]'>
                    {strategyChat.status === 'active' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange('paused')}
                          disabled={isUpdating}
                        >
                          Pause
                          <DropdownMenuShortcut>
                            <Pause className='size-4' />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange('stopped')}
                          disabled={isUpdating}
                        >
                          Stop
                          <DropdownMenuShortcut>
                            <Square className='size-4' />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange('completed')}
                          disabled={isUpdating}
                        >
                          Complete
                          <DropdownMenuShortcut>
                            <CheckCircle className='size-4' />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {strategyChat.status === 'paused' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange('active')}
                          disabled={isUpdating}
                        >
                          Resume
                          <DropdownMenuShortcut>
                            <Play className='size-4' />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange('stopped')}
                          disabled={isUpdating}
                        >
                          Stop
                          <DropdownMenuShortcut>
                            <Square className='size-4' />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange('completed')}
                          disabled={isUpdating}
                        >
                          Complete
                          <DropdownMenuShortcut>
                            <CheckCircle className='size-4' />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {strategyChat.status === 'stopped' && (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('active')}
                        disabled={isUpdating}
                      >
                        Restart
                        <DropdownMenuShortcut>
                          <Play className='size-4' />
                        </DropdownMenuShortcut>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: 2 columns, Tablet: 3 columns, Desktop: 5 columns */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-1 text-center">
                      <h3 className="text-xs md:text-sm font-medium text-muted-foreground">{metric.title}</h3>
                      {metric.isToolTipNeed && metric.tipMessage && (
                        <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="size-3 text-muted-foreground hover:text-foreground cursor-help shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{metric.tipMessage}</p>
                          </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-lg md:text-xl lg:text-2xl font-bold text-center w-full break-words">{metric.value}</p>
                    {(metric.currency || metric.usd) && (
                      <div className="flex flex-col items-center gap-1 text-xs md:text-sm text-muted-foreground font-medium justify-center w-full text-center">
                        {metric.currency && <span className="break-words">{metric.currency}</span>}
                        {metric.usd && <span className="break-words">{metric.usd}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart - Hidden on mobile, shown on larger screens */}
        {/* <div className="hidden lg:block lg:flex-[1] lg:max-w-md h-full">
          <div className="h-full overflow-hidden">
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
        </div> */}
      </div>


      {/* Chart - Mobile version, stacked below on small screens */}
      {/* <div className="lg:hidden mt-6">
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
      </div> */}
    </div>

  )
}
