
import { priceServiceServer } from '@/lib/services/price-fetcher/price-service.server';
import { PlatformType } from '@/lib/3party';
import { platformManager, initializePlatforms } from '@/lib/3party';


// Test 123 - commented out for now
// async function testFetchSpotHistoricalData() {
//   console.log('=== Testing fetchSpotHistoricalData ===\n');

//   // Test 1: BTC 7 days, 1 hour interval
//   console.log('Test 1: BTC 7 days, 1 hour interval');
//   try {
//     const result1 = await priceServiceServer.fetchSpotHistoricalData('BTC', 'USDT', '7d', '1H', PlatformType.OKX);
//     console.log('BTC 7d result:');
//     console.log(`  Symbol: ${result1.symbol}`);
//     console.log(`  Period: ${result1.period}`);
//     console.log(`  Interval: ${result1.interval}`);
//     console.log(`  Data points: ${result1.data.length}`);
//     console.log(`  Platform: ${result1.platform}`);
//     console.log(`  Error: ${result1.error}`);
//     
//     console.log(`  ✅ Test result: ${result1.data.length > 0 ? 'SUCCESS' : 'NO DATA'}`);
//   } catch (error) {
//     console.error('Error testing BTC 7d:', error);
//   }

//   console.log('\n---\n');

//   // Test 2: ETH 30 days, 6 hour interval
//   console.log('Test 2: ETH 30 days, 6 hour interval');
//   try {
//     const result2 = await priceServiceServer.fetchSpotHistoricalData('ETH', 'USDT', '30d', '6H', PlatformType.OKX);
//     console.log('ETH 30d result:');
//     console.log(`  Symbol: ${result2.symbol}`);
//     console.log(`  Period: ${result2.period}`);
//     console.log(`  Interval: ${result2.interval}`);
//     console.log(`  Data points: ${result2.data.length}`);
//     console.log(`  Platform: ${result2.platform}`);
//     console.log(`  Error: ${result2.error}`);
//     
//     console.log(`  ✅ Test result: ${result2.data.length > 0 ? 'SUCCESS' : 'NO DATA'}`);
//   } catch (error) {
//     console.error('Error testing ETH 30d:', error);
//   }

//   console.log('\n---\n');

//   // Test 3: Test different time periods
//   console.log('Test 3: BTC different time periods comparison');
//   try {
//     const periods = ['7d', '30d', '90d'] as const;
//     const intervals = ['1H', '6H', '1d'] as const;
//     
//     for (let i = 0; i < periods.length; i++) {
//       const period = periods[i];
//       const interval = intervals[i];
//       
//       console.log(`  Testing ${period} with ${interval} interval...`);
//       const result = await priceServiceServer.fetchSpotHistoricalData('BTC', 'USDT', period, interval, PlatformType.OKX);
//       console.log(`    Result: ${result.data.length} data points, Platform: ${result.platform}, Error: ${result.error || 'None'}`);
//     }
//   } catch (error) {
//     console.error('Error testing different periods:', error);
//   }

//   console.log('\n=== Historical Data Test completed ===');
// }

async function testOptionHistoricalKlines() {
  console.log('=== Testing Option Historical Mark Price Klines ===\n');

  try {
    // Initialize platforms
    initializePlatforms();
    
    // Get OKX platform
    const platform = await platformManager.getPlatformWithFallback(PlatformType.OKX);
    
    if (!platform || platform.name !== 'OKX') {
      console.error('❌ Failed to get OKX platform');
      return;
    }
    
    console.log('✅ OKX platform initialized successfully');
    
    // Test: Option contract ETHUSD-250801-3900-C
    const symbol = 'ETH-USD-250801-3900-C';
    const interval = '1H';
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    console.log(`\nTest: Option Historical Mark Price Klines for ${symbol}`);
    console.log(`  API Endpoint: GET /api/v5/market/history-mark-price-candles`);
    console.log(`  Interval: ${interval}`);
    console.log(`  Time range: ${new Date(sevenDaysAgo).toISOString()} to ${new Date(now).toISOString()}`);
    
    // Call fetchOptionHistoricalKlines directly on OKX adapter
    const okxPlatform = platform as any;
    if (!okxPlatform.fetchOptionHistoricalKlines) {
      console.error('❌ fetchOptionHistoricalKlines method not found on OKX platform');
      return;
    }
    
    const result = await okxPlatform.fetchOptionHistoricalKlines(symbol, interval, sevenDaysAgo, now);
    
    console.log('\nOption Historical Klines Result:');
    console.log(`  API Response Type: ${typeof result}`);
    console.log(`  Has data property: ${result && 'data' in result}`);
    console.log(`  Has code property: ${result && 'code' in result}`);
    
    if (result && result.code) {
      console.log(`  API Code: ${result.code}`);
      console.log(`  API Message: ${result.msg || 'No message'}`);
    }
    
    if (result && result.data && Array.isArray(result.data)) {
      console.log(`  Data points: ${result.data.length}`);
      
      if (result.data.length > 0) {
        const firstItem = result.data[0];
        const lastItem = result.data[result.data.length - 1];
        
        console.log(`  First data point:`);
        console.log(`    Timestamp: ${firstItem[0]} (${new Date(parseInt(firstItem[0])).toISOString()})`);
        console.log(`    OHLC: ${firstItem[1]}, ${firstItem[2]}, ${firstItem[3]}, ${firstItem[4]}`);
        
        console.log(`  Last data point:`);
        console.log(`    Timestamp: ${lastItem[0]} (${new Date(parseInt(lastItem[0])).toISOString()})`);
        console.log(`    OHLC: ${lastItem[1]}, ${lastItem[2]}, ${lastItem[3]}, ${lastItem[4]}`);
        
        console.log(`  ✅ Test result: SUCCESS - Got ${result.data.length} data points`);
      } else {
        console.log('  ⚠️  No data points returned');
        console.log('  ✅ Test result: NO DATA');
      }
    } else {
      console.log('  ❌ Invalid or missing data in response');
      console.log('  Raw response:', JSON.stringify(result, null, 2));
      console.log('  ✅ Test result: FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error testing option historical klines:', error);
  }

  console.log('\n=== Option Historical Mark Price Klines Test completed ===');
}

// Run tests
async function runAllTests() {
  try {
    // Test option historical klines directly using OKX adapter
    await testOptionHistoricalKlines();
    
    // Original historical data tests are commented out (Test 123)
    // await testFetchSpotHistoricalData();
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runAllTests();
