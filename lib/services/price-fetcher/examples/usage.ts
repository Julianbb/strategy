import { priceServiceServer } from '../price-service.server';
import { PlatformType } from '../platforms';

// Example 1: Basic usage with default platform (OKX)
async function basicUsage() {
  const priceData = await priceServiceServer.fetchPriceData('BTC');
  console.log('BTC price:', priceData.currencyPrice);
  console.log('Platform used:', priceData.platform);
}

// Example 2: Fetch both spot and option prices
async function fetchWithOptions() {
  const optionInstrument = 'BTC-USD-250725-50000-C';
  const priceData = await priceServiceServer.fetchPriceData('BTC', optionInstrument);
  
  console.log('BTC spot price:', priceData.currencyPrice);
  console.log('Option price:', priceData.optionsPrice);
  console.log('Platform used:', priceData.platform);
}

// Example 3: Use specific platform
async function useSpecificPlatform() {
  // Force using Binance (note: Binance doesn't support options)
  const priceData = await priceServiceServer.fetchPriceData(
    'ETH', 
    null, 
    PlatformType.BINANCE
  );
  
  console.log('ETH price from Binance:', priceData.currencyPrice);
  console.log('Platform used:', priceData.platform);
}

// Example 4: Platform management
async function platformManagement() {
  // Get available platforms
  const available = await priceServiceServer.getAvailablePlatforms();
  console.log('Available platforms:', available);
  
  // Get healthy platforms
  const healthy = await priceServiceServer.getHealthyPlatforms();
  console.log('Healthy platforms:', healthy);
  
  // Set primary platform
  await priceServiceServer.setPrimaryPlatform(PlatformType.BINANCE);
  console.log('Primary platform set to Binance');
}

// Example 5: Error handling and fallback
async function errorHandlingExample() {
  try {
    // This will try OKX first, then fallback to other healthy platforms
    const priceData = await priceServiceServer.fetchPriceData('BTC');
    
    if (priceData.error) {
      console.error('Error fetching price:', priceData.error);
    } else {
      console.log('Price fetched successfully:', priceData.currencyPrice);
      console.log('Platform used:', priceData.platform);
      console.log('Timestamp:', new Date(priceData.timestamp!));
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Example 6: Working with strategy chat
async function strategyExample() {
  const strategyChatId = 'some-strategy-id';
  
  // Get the option instrument for this strategy
  const instrument = await priceServiceServer.getOptionInstrument(strategyChatId);
  
  if (instrument) {
    // Fetch prices for the strategy
    const priceData = await priceServiceServer.fetchPriceData('ETH', instrument);
    
    console.log('Strategy prices:');
    console.log('- Spot price:', priceData.currencyPrice);
    console.log('- Option price:', priceData.optionsPrice);
    console.log('- Instrument:', priceData.optionInstrument);
    console.log('- Platform:', priceData.platform);
  } else {
    console.log('No option instrument found for strategy');
  }
}

// Run examples (uncomment to test)
// basicUsage();
// fetchWithOptions();
// useSpecificPlatform();
// platformManagement();
// errorHandlingExample();
// strategyExample();