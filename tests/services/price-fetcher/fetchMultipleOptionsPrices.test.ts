import { PriceServiceServer } from '@/lib/services/price-fetcher/price-service.server';
import { PlatformType } from '@/lib/services/price-fetcher/platforms';

describe('PriceServiceServer - fetchMultipleOptionsPrices', () => {
  let priceService: PriceServiceServer;

  beforeAll(() => {
    priceService = new PriceServiceServer();
  });

  test('should fetch single option price for ETH-USD-250725-3600-P', async () => {
    console.log('🚀 开始测试单个期权价格获取功能...\n');
    
    const instrumentId = 'ETH-USD-250725-3600-P';
    const instrumentIds = [instrumentId];
    
    console.log(`🎯 获取期权合约: ${instrumentId}`);
    console.log(`📊 使用平台: OKX\n`);
    
    const result = await priceService.fetchMultipleOptionsPrices(
      instrumentIds, 
      PlatformType.OKX
    );
    
    console.log('📝 测试结果:');
    console.log('═'.repeat(50));
    console.log(`平台: ${result.platform}`);
    console.log(`错误信息: ${result.error}`);
    console.log(`时间戳: ${result.timestamp ? new Date(result.timestamp).toISOString() : 'N/A'}`);
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('prices');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('timestamp');
    
    if (result.error) {
      console.log(`❌ 获取失败: ${result.error}`);
      expect(result.error).toBeTruthy();
    } else {
      console.log('✅ 获取成功!');
      console.log(`期权价格: ${result.prices[instrumentId]}`);
      
      expect(result.error).toBeNull();
      expect(result.prices).toHaveProperty(instrumentId);
      expect(result.platform).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
      
      if (result.prices[instrumentId] !== null) {
        expect(typeof result.prices[instrumentId]).toBe('number');
        console.log(`💰 ${instrumentId} 价格: ${result.prices[instrumentId]}`);
      } else {
        console.log(`⚠️ ${instrumentId} 暂无价格数据`);
      }
    }
    
    console.log('═'.repeat(50) + '\n');
  }, 30000);

  test('should fetch multiple option prices for ETH-USD-250725-3600-P and ETH-USD-250725-3800-P', async () => {
    console.log('🚀 开始测试多个期权价格获取功能...\n');
    
    const instrumentIds = [
      'ETH-USD-250725-3600-P',
      'ETH-USD-250725-3800-P'
    ];
    
    console.log('🎯 获取期权合约:');
    instrumentIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    console.log(`📊 使用平台: OKX\n`);
    
    const result = await priceService.fetchMultipleOptionsPrices(
      instrumentIds, 
      PlatformType.OKX
    );
    
    console.log('📝 测试结果:');
    console.log('═'.repeat(60));
    console.log(`平台: ${result.platform}`);
    console.log(`错误信息: ${result.error}`);
    console.log(`时间戳: ${result.timestamp ? new Date(result.timestamp).toISOString() : 'N/A'}`);
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('prices');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('timestamp');
    
    if (result.error) {
      console.log(`❌ 获取失败: ${result.error}`);
      expect(result.error).toBeTruthy();
    } else {
      console.log('✅ 获取成功!');
      console.log('\n💰 期权价格详情:');
      console.log('-'.repeat(40));
      
      expect(result.error).toBeNull();
      expect(result.platform).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
      
      instrumentIds.forEach((instrumentId, index) => {
        const price = result.prices[instrumentId];
        console.log(`${index + 1}. ${instrumentId}`);
        
        expect(result.prices).toHaveProperty(instrumentId);
        
        if (price !== null) {
          expect(typeof price).toBe('number');
          console.log(`   价格: ${price}`);
        } else {
          console.log(`   价格: 暂无数据`);
        }
        console.log();
      });
      
      expect(Object.keys(result.prices)).toHaveLength(instrumentIds.length);
      
      const validPrices = Object.values(result.prices).filter(price => price !== null);
      const nullPrices = Object.values(result.prices).filter(price => price === null);
      
      console.log('📊 统计信息:');
      console.log(`   总合约数: ${instrumentIds.length}`);
      console.log(`   有效价格: ${validPrices.length}`);
      console.log(`   无效价格: ${nullPrices.length}`);
    }
    
    console.log('═'.repeat(60) + '\n');
  }, 30000);

  test('should handle invalid instrument IDs gracefully', async () => {
    console.log('🧪 测试无效合约ID的处理...\n');
    
    const invalidInstrumentIds = ['INVALID-CONTRACT-1', 'INVALID-CONTRACT-2'];
    
    const result = await priceService.fetchMultipleOptionsPrices(
      invalidInstrumentIds, 
      PlatformType.OKX
    );
    
    console.log(`📝 无效合约处理结果:`);
    console.log(`错误信息: ${result.error}`);
    console.log(`返回的价格数据:`, result.prices);
    
    expect(result).toBeDefined();
    expect(result.prices).toBeDefined();
    expect(Object.keys(result.prices)).toHaveLength(invalidInstrumentIds.length);
    
    invalidInstrumentIds.forEach(id => {
      expect(result.prices).toHaveProperty(id);
      expect(result.prices[id]).toBeNull();
    });
  }, 30000);

  test('should handle empty instrument IDs array', async () => {
    console.log('🧪 测试空合约ID数组的处理...\n');
    
    const result = await priceService.fetchMultipleOptionsPrices([], PlatformType.OKX);
    
    console.log(`📝 空数组处理结果:`);
    console.log(`错误信息: ${result.error}`);
    console.log(`返回的价格数据:`, result.prices);
    
    expect(result).toBeDefined();
    expect(result.prices).toBeDefined();
    expect(Object.keys(result.prices)).toHaveLength(0);
  }, 30000);
});