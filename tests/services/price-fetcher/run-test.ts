
import { priceService } from '@/lib/services/price-fetcher';
import { PlatformType } from '@/lib/3party';

async function testFetchMultipleOptionExercisePrices() {
  console.log('=== Testing fetchMultipleOptionExercisePrices ===\n');

  // Test 1: Single instrument
  console.log('Test 1: Single instrument');
  try {
    const singleInstrument = ['ETH-USD-250722-3600-P'];
    const result1 = await priceService.fetchMultipleOptionExercisePrices(singleInstrument, PlatformType.OKX);
    console.log('Single instrument result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('Error testing single instrument:', error);
  }

  console.log('\n---\n');

  // Test 2: Two instruments
  console.log('Test 2: Two instruments');
  try {
    const twoInstruments = ['ETH-USD-250722-3800-P', 'ETH-USD-250722-3600-C'];
    const result2 = await priceService.fetchMultipleOptionExercisePrices(twoInstruments, PlatformType.OKX);
    console.log('Two instruments result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('Error testing two instruments:', error);
  }

  console.log('\n=== Test completed ===');
}

// Run the test
testFetchMultipleOptionExercisePrices().catch(console.error);
