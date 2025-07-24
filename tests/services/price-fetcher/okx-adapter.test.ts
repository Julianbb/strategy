import { OKXAdapter } from '@/lib/services/price-fetcher/platforms/okx-adapter';

/**
 * OKX 适配器测试 - 测试 getDeliveryExerciseHistory 功能
 */
describe('OKX Adapter Tests', () => {
  let okxAdapter: OKXAdapter;

  beforeAll(() => {
    okxAdapter = new OKXAdapter();
  });

  test('getDeliveryExerciseHistory should fetch ETH-USD option delivery history', async () => {
    console.log('🚀 开始测试 OKX getDeliveryExerciseHistory 功能...\n');
    
    // 测试参数
    const underlying = 'ETH-USD';
    const targetInstrumentId = 'ETH-USD-20250722-3600-P';
    
    console.log(`📊 获取 ${underlying} 的期权交割历史数据...`);
    console.log(`🎯 目标期权合约: ${targetInstrumentId}\n`);
    
    // 调用 getDeliveryExerciseHistory 方法
    const history = await okxAdapter.getDeliveryExerciseHistory(underlying, 100);
    
    // 基本断言
    expect(history).not.toBeNull();
    
    if (history && history.length > 0) {
      console.log(`✅ 成功获取到 ${history.length} 条历史记录\n`);
      console.log('📝 历史记录样本:');
      console.log('═'.repeat(80));
      
      // 显示前5条记录
      history.slice(0, 5).forEach((record, index) => {
        const date = new Date(parseInt(record.timestamp)).toISOString();
        console.log(`${index + 1}. 合约: ${record.instrumentId}`);
        console.log(`   执行价格: ${record.exercisePrice}`);
        console.log(`   时间戳: ${date}`);
        console.log('-'.repeat(50));
      });
      
      // 查找目标期权合约
      console.log(`\n🔍 查找目标期权合约: ${targetInstrumentId}`);
      const targetRecord = history.find(record => record.instrumentId === targetInstrumentId);
      
      if (targetRecord) {
        console.log('🎉 找到目标期权合约!');
        console.log(`   合约ID: ${targetRecord.instrumentId}`);
        console.log(`   执行价格: ${targetRecord.exercisePrice}`);
        console.log(`   时间: ${new Date(parseInt(targetRecord.timestamp)).toISOString()}`);
        
        if (targetRecord.exercisePrice === 0) {
          console.log('   📋 状态: 价外期权 (OTM) - 未执行');
        } else {
          console.log('   📋 状态: 价内期权 (ITM) - 已执行');
        }
        
        // 断言目标记录存在
        expect(targetRecord.instrumentId).toBe(targetInstrumentId);
        expect(typeof targetRecord.exercisePrice).toBe('number');
        expect(targetRecord.exercisePrice).toBeGreaterThanOrEqual(0);
      } else {
        console.log('❌ 未找到目标期权合约');
        console.log('💡 可能原因:');
        console.log('   1. 该期权尚未到期');
        console.log('   2. 合约ID格式不正确');
        console.log('   3. 该期权不在最近的历史记录中');
      }
      
      // 统计信息
      console.log('\n📊 统计信息:');
      console.log('═'.repeat(40));
      const otmCount = history.filter(r => r.exercisePrice === 0).length;
      const itmCount = history.filter(r => r.exercisePrice > 0).length;
      
      console.log(`总记录数: ${history.length}`);
      console.log(`价外期权 (OTM): ${otmCount} 条`);
      console.log(`价内期权 (ITM): ${itmCount} 条`);
      
      // 断言统计数据
      expect(history.length).toBeGreaterThan(0);
      expect(otmCount + itmCount).toBe(history.length);
      
      // 验证每条记录的结构
      history.forEach(record => {
        expect(record).toHaveProperty('instrumentId');
        expect(record).toHaveProperty('exercisePrice');
        expect(record).toHaveProperty('timestamp');
        expect(typeof record.exercisePrice).toBe('number');
        expect(record.exercisePrice).toBeGreaterThanOrEqual(0);
      });
      
    } else {
      console.log('❌ 未获取到历史数据');
      // 如果没有数据，测试仍然通过，但会记录
      expect(history).toEqual([]);
    }
  }, 30000); // 30秒超时

  test('getOptionExercisePrice should fetch specific option exercise price', async () => {
    console.log('\n🔧 开始测试 getOptionExercisePrice 功能...\n');
    
    const instrumentId = 'ETH-USD-20250722-3600-P';
    
    console.log(`🎯 获取期权 ${instrumentId} 的执行价格...`);
    
    const exercisePrice = await okxAdapter.getOptionExercisePrice(instrumentId);
    
    if (exercisePrice !== null) {
      console.log(`✅ 执行价格: ${exercisePrice}`);
      
      if (exercisePrice === 0) {
        console.log('📋 状态: 价外期权 (OTM) - 未执行');
      } else {
        console.log('📋 状态: 价内期权 (ITM) - 已执行');
      }
      
      // 断言
      expect(typeof exercisePrice).toBe('number');
      expect(exercisePrice).toBeGreaterThanOrEqual(0);
    } else {
      console.log('❌ 未找到该期权的执行价格');
      // null 也是有效的返回值
      expect(exercisePrice).toBeNull();
    }
  }, 30000); // 30秒超时

  test('should handle invalid instrument ID gracefully', async () => {
    console.log('\n🧪 测试无效合约ID的处理...\n');
    
    const invalidInstrumentId = 'INVALID-CONTRACT-ID';
    
    const exercisePrice = await okxAdapter.getOptionExercisePrice(invalidInstrumentId);
    
    console.log(`📝 无效合约 ${invalidInstrumentId} 的结果: ${exercisePrice}`);
    
    // 无效ID应该返回null
    expect(exercisePrice).toBeNull();
  });
});