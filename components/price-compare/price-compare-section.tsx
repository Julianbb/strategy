'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, TrendingUp, RefreshCw } from 'lucide-react';
import { usePriceCompare } from './price-compare-context';
import { PriceCompareChart } from './price-compare-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PriceCompareSection() {
  const { 
    products, 
    timePeriod, 
    loading,
    error,
    setOpen, 
    removeProduct,
    setTimePeriod,
    refreshData
  } = usePriceCompare();

  const handleAddProduct = () => {
    setOpen('add-product');
  };

  const handleRemoveProduct = (id: string) => {
    removeProduct(id);
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-[400px] bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold">Price Comparison</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Compare different products' price movements over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={timePeriod} 
            onValueChange={(value: '7d' | '30d' | '90d') => setTimePeriod(value)}
            disabled={loading}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={refreshData} 
            variant="outline"
            size="icon"
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={handleAddProduct} 
            className="flex items-center gap-2"
            disabled={products.length >= 5 || loading}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-red-600">⚠️</div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-red-800">
                  Failed to load price data
                </span>
                <span className="text-xs text-red-700 mt-1">
                  {error}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-4 md:size-5" />
              <h2 className="text-lg font-semibold">Products ({products.length}/5)</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {products.map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-2 bg-muted rounded-md px-3 py-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: product.color }}
                  />
                  <span className="text-sm font-medium">{product.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProduct(product.id)}
                    className="p-0 h-auto ml-1 hover:bg-transparent"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            {products.length >= 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                Maximum of 5 products can be compared at once
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <PriceCompareChart />
    </div>
  );
}