'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { priceServiceServer } from '@/lib/services/price-fetcher/price-service.server';
import { HistoricalPeriod, HistoricalInterval, HistoricalDataPoint } from '@/lib/services/price-fetcher/price-service';

export type ProductType = 'spot' | 'option';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  baseCurrency: 'ETH' | 'BTC';
  expiryDate?: string;
  strikePrice?: number;
  optionType?: 'CALL' | 'PUT';
  color: string;
}

export interface PriceData {
  date: string;
  [productId: string]: number | string;
}

export type TimePeriod = HistoricalPeriod;

interface PriceCompareContextType {
  products: Product[];
  priceData: PriceData[];
  timePeriod: TimePeriod;
  loading: boolean;
  open: string | null;
  currentProduct: Product | undefined;
  error: string | null;
  
  addProduct: (product: Omit<Product, 'id' | 'color'>) => void;
  removeProduct: (id: string) => void;
  setTimePeriod: (period: TimePeriod) => void;
  setOpen: (type: string | null) => void;
  setCurrentProduct: (product: Product | undefined) => void;
  refreshData: () => Promise<void>;
}

const PriceCompareContext = createContext<PriceCompareContextType | undefined>(undefined);

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function PriceCompareProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | undefined>();

  // Generate price data using real API
  const generatePriceData = useCallback(async (products: Product[], period: TimePeriod): Promise<void> => {
    if (products.length === 0) {
      setPriceData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Choose appropriate interval based on period
      const interval: HistoricalInterval = period === '7d' ? '1H' : period === '30d' ? '6H' : '1d';
      
      // Fetch historical data for all products (spot and option)
      const dataPromises = products.map(product => {
        if (product.type === 'spot') {
          return priceServiceServer.fetchSpotHistoricalData(
            product.baseCurrency,
            'USDT',
            period,
            interval
          );
        } else {
          // For options, use the full instrument ID
          const instrumentId = `${product.baseCurrency}-USD-${product.expiryDate?.replace(/-/g, '').slice(2)}-${product.strikePrice}-${product.optionType === 'CALL' ? 'C' : 'P'}`;
          return priceServiceServer.fetchOptionHistoricalData(
            instrumentId,
            period,
            interval
          );
        }
      });

      const dataResults = await Promise.all(dataPromises);
      
      // Create a map of product -> historical data
      const productDataMap = new Map<string, HistoricalDataPoint[]>();
      dataResults.forEach((result, index) => {
        const product = products[index];
        if (result.error) {
          console.error(`Error fetching data for ${product.name}:`, result.error);
          // Even with error, check if we have fallback data
          if (result.data && result.data.length > 0) {
            productDataMap.set(product.id, result.data);
          }
        } else {
          productDataMap.set(product.id, result.data);
        }
      });

      // Check if we have any data at all
      if (productDataMap.size === 0) {
        setPriceData([]);
        return;
      }

      // Generate combined price data
      const combinedData: PriceData[] = [];
      
      // Find common timestamps across all products
      const allTimestamps = new Set<number>();
      productDataMap.forEach((data) => {
        data.forEach(point => allTimestamps.add(point.timestamp));
      });
      
      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
      
      // Generate data points for each timestamp
      sortedTimestamps.forEach(timestamp => {
        const dataPoint: PriceData = {
          date: new Date(timestamp).toISOString(),
        };
        
        products.forEach(product => {
          const productData = productDataMap.get(product.id);
          if (!productData) return;
          
          // Find the closest data point for this timestamp
          const closestPoint = productData.reduce((closest, current) => {
            return Math.abs(current.timestamp - timestamp) < Math.abs(closest.timestamp - timestamp)
              ? current
              : closest;
          });
          
          // Use open price for both spot and option (represents the opening time of the candlestick)
          let price = closestPoint.open;
          
          // For options (ETH unit), keep 3 significant digits for better precision
          if (product.type === 'option') {
            price = parseFloat(price.toPrecision(3));
          }
          
          dataPoint[product.id] = price;
        });
        
        combinedData.push(dataPoint);
      });
      
      setPriceData(combinedData);
      
    } catch (err) {
      console.error('Error generating price data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
      setPriceData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data when products or time period changes
  const refreshData = useCallback(async () => {
    await generatePriceData(products, timePeriod);
  }, [products, timePeriod, generatePriceData]);

  // Auto-refresh data when dependencies change
  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addProduct = useCallback((productData: Omit<Product, 'id' | 'color'>) => {
    if (products.length >= 5) return;
    
    const id = Math.random().toString(36).substring(2, 11);
    const color = COLORS[products.length];
    
    let name = productData.type === 'spot' 
      ? `${productData.baseCurrency}USD Spot`
      : (() => {
          // Format date from YYYY-MM-DD to YYMMDD
          const date = new Date(productData.expiryDate!);
          const year = date.getFullYear().toString().slice(-2);
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const formattedDate = `${year}${month}${day}`;
          
          return `${productData.baseCurrency}USD-${formattedDate}-${productData.strikePrice}-${productData.optionType}`;
        })();
    
    const newProduct: Product = {
      ...productData,
      id,
      name,
      color
    };
    
    setProducts(prev => [...prev, newProduct]);
  }, [products.length]);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleSetTimePeriod = useCallback((period: TimePeriod) => {
    setTimePeriod(period);
  }, []);

  const value: PriceCompareContextType = {
    products,
    priceData,
    timePeriod,
    loading,
    open,
    currentProduct,
    error,
    addProduct,
    removeProduct,
    setTimePeriod: handleSetTimePeriod,
    setOpen,
    setCurrentProduct,
    refreshData
  };

  return (
    <PriceCompareContext.Provider value={value}>
      {children}
    </PriceCompareContext.Provider>
  );
}

export function usePriceCompare() {
  const context = useContext(PriceCompareContext);
  if (context === undefined) {
    throw new Error('usePriceCompare must be used within a PriceCompareProvider');
  }
  return context;
}