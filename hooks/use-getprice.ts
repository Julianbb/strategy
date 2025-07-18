'use client';


import {convertInstrumentFlexible} from "@/lib/utils"
import { fetchPrices } from "@/lib/3party/okxapi"
import { useState, useEffect, useCallback } from 'react';

interface PriceData {
  currencyPrice: number | null;
  optionsPrice: number | null;
  isLoaded: boolean;
  optionInstrument: string | null;
  error: string | null;

}

interface StrategyChatType {
  id: string;
  baseCurrency: string;
}

export function usePriceData(strategyChat: StrategyChatType): PriceData {
  const [currencyPrice, setCurrencyPrice] = useState<number | null>(null);
  const [optionsPrice, setOptionsPrice] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [optionInstrument, setOptionInstrument] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理客户端挂载，避免SSR水合冲突
  useEffect(() => {
    setIsMounted(true);
    setIsLoaded(true);
  }, []);

  // 获取期权工具信息
  useEffect(() => {
    if (!isMounted) return;
    
    let isEffectMounted = true;
    
    async function getOptionInstrument() {
      try {
        setError(null);
        const response = await fetch(`/api/strategy-chat/${strategyChat.id}/option-instrument`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (isEffectMounted && data.instrument) {
          const convertedInstrument = convertInstrumentFlexible(data.instrument);
          setOptionInstrument(convertedInstrument);
        }
      } catch (err) {
        console.error('Error fetching option instrument:', err);
        if (isEffectMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch option instrument');
        }
      }
    }

    getOptionInstrument();
    
    return () => {
      isEffectMounted = false;
    };
  }, [strategyChat.id, isMounted]);

  // 获取价格数据
  useEffect(() => {
    if (!isMounted || !strategyChat.baseCurrency) {
      return;
    }

    let isEffectMounted = true;
    let intervalId: NodeJS.Timeout;

    async function updatePrices() {
      try {
        setError(null);

        if (optionInstrument) {
          // Strategy has options - fetch both spot and option prices
          const { spotPrice, optionPrice } = await fetchPrices(
            strategyChat.baseCurrency, 
            optionInstrument
          );
          
          if (!isEffectMounted) return;
          
          setCurrencyPrice(prev => spotPrice !== null ? spotPrice : prev);
          setOptionsPrice(prev => optionPrice !== null ? optionPrice : prev);
        } else {
          // Strategy only has base currency - fetch spot price only
          const { fetchSpotPrice } = await import('@/lib/3party/okxapi');
          const spotPrice = await fetchSpotPrice(strategyChat.baseCurrency);
          
          if (!isEffectMounted) return;
          
          setCurrencyPrice(prev => spotPrice !== null ? spotPrice : prev);
          setOptionsPrice(null);
        }
        
      } catch (err) {
        console.error('Fetch error:', err);
        if (isEffectMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        }
      }
    }

    updatePrices();
    
    intervalId = setInterval(() => {
      if (isEffectMounted) {
        updatePrices();
      }
    }, 10000);

    return () => {
      isEffectMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [strategyChat.baseCurrency, optionInstrument, isMounted]);



  return {
    currencyPrice,
    optionsPrice,
    isLoaded: isLoaded && isMounted,
    optionInstrument,
    error
  };
}