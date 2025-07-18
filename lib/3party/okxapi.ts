/**
 * OKX API integration for fetching current market prices
 */

export interface PriceData {
  spotPrice: number;
  optionPrice: number;
}

/**
 * Fetch spot price for a specific currency pair from OKX
 * @param baseCurrency - Base currency (e.g., 'ETH', 'BTC')
 * @param quoteCurrency - Quote currency (default: 'USDT')
 */
export async function fetchSpotPrice(baseCurrency: string, quoteCurrency: string = 'USDT'): Promise<number | null> {
  try {
    const instId = `${baseCurrency}-${quoteCurrency}`;
    const response = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
    const data = await response.json();
    
    if (data && data.data && data.data[0] && data.data[0].last) {
      return parseFloat(data.data[0].last);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching spot price for ${baseCurrency}:`, error);
    return null;
  }
}

/**
 * Fetch options mark price from OKX
 * @param instId - Options instrument ID (e.g., 'ETH-USD-250725-2100-P') - REQUIRED
 */
export async function fetchOptionsPrice(instId: string): Promise<number | null> {
  try {
    const response = await fetch(`https://www.okx.com/api/v5/public/mark-price?instType=OPTION&instId=${instId}`);
    const data = await response.json();
    
    if (data && data.data && data.data[0] && data.data[0].markPx) {
      return parseFloat(data.data[0].markPx);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching options price for ${instId}:`, error);
    return null;
  }
}

/**
 * Fetch both spot and options prices for a strategy
 * @param baseCurrency - Base currency for spot price - REQUIRED
 * @param optionsInstId - Options instrument ID - OPTIONAL (if not provided, only spot price is fetched)
 */
export async function fetchPrices(baseCurrency: string, optionsInstId?: string): Promise<{
  spotPrice: number | null;
  optionPrice: number | null;
}> {
  try {
    // Always fetch spot price, only fetch option price if optionsInstId is provided
    const promises = [fetchSpotPrice(baseCurrency)];
    
    if (optionsInstId) {
      promises.push(fetchOptionsPrice(optionsInstId));
    }
    
    const results = await Promise.all(promises);
    const spotPrice = results[0];
    const optionPrice = results.length > 1 ? results[1] : null;
    
    return {
      spotPrice,
      optionPrice
    };
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {
      spotPrice: null,
      optionPrice: null
    };
  }
}


