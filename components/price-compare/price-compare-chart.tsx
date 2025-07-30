'use client';

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { usePriceCompare } from "./price-compare-context";

export function PriceCompareChart() {
  const { products, priceData, timePeriod, loading, error } = usePriceCompare();

  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      price: {
        label: "Price",
      },
    };

    products.forEach((product) => {
      config[product.id] = {
        label: product.name,
        color: product.color,
      };
    });

    return config;
  }, [products]);

  // Separate products by type for dual Y-axis
  const spotProducts = React.useMemo(() => products.filter(p => p.type === 'spot'), [products]);
  const optionProducts = React.useMemo(() => products.filter(p => p.type === 'option'), [products]);
  const hasSpotProducts = spotProducts.length > 0;
  const hasOptionProducts = optionProducts.length > 0;

  // Calculate Y-axis domains with 10% padding
  const yAxisDomains = React.useMemo(() => {
    if (priceData.length === 0) return { spot: undefined, option: undefined };

    let spotMin = Infinity, spotMax = -Infinity;
    let optionMin = Infinity, optionMax = -Infinity;

    priceData.forEach(dataPoint => {
      spotProducts.forEach(product => {
        const value = dataPoint[product.id];
        if (typeof value === 'number') {
          spotMin = Math.min(spotMin, value);
          spotMax = Math.max(spotMax, value);
        }
      });

      optionProducts.forEach(product => {
        const value = dataPoint[product.id];
        if (typeof value === 'number') {
          optionMin = Math.min(optionMin, value);
          optionMax = Math.max(optionMax, value);
        }
      });
    });

    const spotDomain = spotMin !== Infinity ? {
      min: spotMin - (spotMax - spotMin) * 0.1,
      max: spotMax + (spotMax - spotMin) * 0.1
    } : undefined;

    const optionDomain = optionMin !== Infinity ? {
      min: optionMin - (optionMax - optionMin) * 0.1,
      max: optionMax + (optionMax - optionMin) * 0.1
    } : undefined;

    return {
      spot: spotDomain ? [spotDomain.min, spotDomain.max] : undefined,
      option: optionDomain ? [optionDomain.min, optionDomain.max] : undefined
    };
  }, [priceData, spotProducts, optionProducts]);



  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-6xl mb-4 text-muted-foreground">📊</div>
          <h3 className="text-lg font-semibold mb-2 text-center">No products to compare</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Add products to start comparing their price movements over time
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-semibold mb-2 text-center">Loading price data...</h3>
          <p className="text-sm text-muted-foreground text-center">
            Fetching historical data from exchange APIs
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-6xl mb-4 text-red-500">⚠️</div>
          <h3 className="text-lg font-semibold mb-2 text-center">Error loading data</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (priceData.length === 0 && products.length > 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-6xl mb-4 text-muted-foreground">📊</div>
          <h3 className="text-lg font-semibold mb-2 text-center">No price data available</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Unable to fetch price data for the selected products
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return 'Price comparison';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Comparison</CardTitle>
        <CardDescription>
          Comparing {products.length} product{products.length > 1 ? 's' : ''} over {getTimePeriodLabel().toLowerCase()}
          {hasSpotProducts && hasOptionProducts && ' • Left axis: Spot (USDT) • Right axis: Options (ETH)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[400px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={priceData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                // Format in local timezone: MM-DD HH:MM
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${month}-${day} ${hours}:${minutes}`;
              }}
            />
            {/* Left Y-axis for spot prices (USDT) */}
            {hasSpotProducts && (
              <YAxis
                yAxisId="spot"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                domain={yAxisDomains.spot || ['dataMin', 'dataMax']}
              />
            )}
            {/* Right Y-axis for option prices (ETH) */}
            {hasOptionProducts && (
              <YAxis
                yAxisId="option"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${parseFloat(value.toFixed(4))} E`}
                domain={yAxisDomains.option || ['dataMin', 'dataMax']}
              />
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    // Format in local timezone: YYYY-MM-DD HH:MM
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}`;
                  }}
                  formatter={(value, name) => {
                    const productConfig = chartConfig[name];
                    const displayName = productConfig?.label || name;
                    
                    // Check if this is an option product by looking at the label format
                    const isOption = displayName.includes('-') && (displayName.includes('-C') || displayName.includes('-P'));
                    
                    // For options (ETH unit), show more decimal places; for spot, show 2 decimal places
                    const formattedPrice = isOption 
                      ? `${Number(value).toFixed(4)} ETH`
                      : `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    
                    return [
                      `${displayName} ${formattedPrice}`,
                      null,
                    ];
                  }}
                />
              }
            />
            {products.map((product) => (
              <Line
                key={product.id}
                dataKey={product.id}
                type="monotone"
                stroke={product.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                yAxisId={product.type === 'spot' ? 'spot' : 'option'}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}