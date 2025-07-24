// 'use server'
// import { priceServiceServer } from '@/lib/services/price-fetcher/price-service.server';
// import { PlatformType } from '@/lib/services/price-fetcher/platforms';

// /**
//  * 测试单个期权合约的执行价格获取
//  */
// async function testSingleOptionExercisePrice() {
//   console.log('🔧 开始测试单个期权执行价格获取...\n');
  
//   try {
//     const instrumentId = 'ETH-USD-250722-3600-P';
    
//     console.log(`🎯 获取期权 ${instrumentId} 的执行价格...`);
    
//     const result = await priceServiceServer.fetchMultipleOptionExercisePrices(
//       [instrumentId], 
//       PlatformType.OKX
//     );
    
//     console.log('📊 测试结果:');
//     console.log('═'.repeat(50));
//     console.log(`平台: ${result.platform}`);
//     console.log(`时间戳: ${new Date(result.timestamp || 0).toISOString()}`);
//     console.log(`错误信息: ${result.error || '无'}`);
    
//     if (result.prices[instrumentId] !== undefined) {
//       const price = result.prices[instrumentId];
//       console.log(`✅ 执行价格: ${price}`);
      
//       if (price === 0) {
//         console.log('📋 状态: 价外期权 (OTM) - 未执行');
//       } else if (price && price > 0) {
//         console.log('📋 状态: 价内期权 (ITM) - 已执行');
//       } else {
//         console.log('📋 状态: 未找到执行价格数据');
//       }
//     } else {
//       console.log('❌ 未获取到执行价格');
//     }
    
//   } catch (error) {
//     console.error('❌ 测试过程中发生错误:', error);
//   }
// }

// /**
//  * 测试多个期权合约的执行价格获取
//  */
// async function testMultipleOptionExercisePrices() {
//   console.log('\n🔧 开始测试多个期权执行价格获取...\n');
  
//   try {
//     const instrumentIds = ['ETH-USD-250722-3600-P', 'ETH-USD-250721-3800-P', 'BTC-USD-250722-120000-P'];
    
//     console.log(`🎯 获取多个期权的执行价格:`);
//     instrumentIds.forEach((id, index) => {
//       console.log(`   ${index + 1}. ${id}`);
//     });
//     console.log();
    
//     const result = await priceServiceServer.fetchMultipleOptionExercisePrices(
//       instrumentIds, 
//       PlatformType.OKX
//     );
    
//     console.log('📊 测试结果:');
//     console.log('═'.repeat(50));
//     console.log(`平台: ${result.platform}`);
//     console.log(`时间戳: ${new Date(result.timestamp || 0).toISOString()}`);
//     console.log(`错误信息: ${result.error || '无'}`);
//     console.log();
    
//     console.log('📝 各期权执行价格:');
//     console.log('-'.repeat(50));
    
//     instrumentIds.forEach((instrumentId, index) => {
//       const price = result.prices[instrumentId];
//       console.log(`${index + 1}. 合约: ${instrumentId}`);
      
//       if (price !== undefined && price !== null) {
//         console.log(`   执行价格: ${price}`);
        
//         if (price === 0) {
//           console.log('   📋 状态: 价外期权 (OTM) - 未执行');
//         } else if (price > 0) {
//           console.log('   📋 状态: 价内期权 (ITM) - 已执行');
//         }
//       } else {
//         console.log('   ❌ 未找到执行价格数据');
//       }
//       console.log();
//     });
    
//     // 统计信息
//     console.log('📊 统计信息:');
//     console.log('═'.repeat(40));
//     const totalRequested = instrumentIds.length;
//     const foundPrices = Object.values(result.prices).filter(p => p !== null && p !== undefined).length;
//     const otmCount = Object.values(result.prices).filter(p => p === 0).length;
//     const itmCount = Object.values(result.prices).filter(p => p && p > 0).length;
    
//     console.log(`请求合约数: ${totalRequested}`);
//     console.log(`找到价格数: ${foundPrices}`);
//     console.log(`价外期权 (OTM): ${otmCount} 个`);
//     console.log(`价内期权 (ITM): ${itmCount} 个`);
    
//   } catch (error) {
//     console.error('❌ 测试过程中发生错误:', error);
//   }
// }

// /**
//  * 测试单个期权价格获取 (fetchMultipleOptionsPrices)
//  */
// async function testSingleOptionPrice() {
//   console.log('\n🚀 开始测试单个期权价格获取功能...\n');
  
//   try {
//     const instrumentId = 'ETH-USD-250725-3600-P';
    
//     console.log(`🎯 获取期权合约: ${instrumentId}`);
//     console.log(`📊 使用平台: OKX\n`);
    
//     const result = await priceServiceServer.fetchMultipleOptionsPrices(
//       [instrumentId], 
//       PlatformType.OKX
//     );
    
//     console.log('📝 测试结果:');
//     console.log('═'.repeat(50));
//     console.log(`平台: ${result.platform}`);
//     console.log(`错误信息: ${result.error || '无'}`);
//     console.log(`时间戳: ${result.timestamp ? new Date(result.timestamp).toISOString() : 'N/A'}`);
    
//     if (result.error) {
//       console.log(`❌ 获取失败: ${result.error}`);
//     } else {
//       console.log('✅ 获取成功!');
//       const price = result.prices[instrumentId];
      
//       if (price !== null) {
//         console.log(`💰 ${instrumentId} 价格: ${price}`);
//       } else {
//         console.log(`⚠️ ${instrumentId} 暂无价格数据`);
//       }
//     }
    
//     console.log('═'.repeat(50) + '\n');
    
//   } catch (error) {
//     console.error('❌ 测试过程中发生错误:', error);
//   }
// }

// /**
//  * 测试多个期权价格获取 (fetchMultipleOptionsPrices)
//  */
// async function testMultipleOptionPrices() {
//   console.log('🚀 开始测试多个期权价格获取功能...\n');
  
//   try {
//     const instrumentIds = [
//       'ETH-USD-250725-3600-P',
//       'ETH-USD-250725-3800-P'
//     ];
    
//     console.log('🎯 获取期权合约:');
//     instrumentIds.forEach((id, index) => {
//       console.log(`   ${index + 1}. ${id}`);
//     });
//     console.log(`📊 使用平台: OKX\n`);
    
//     const result = await priceServiceServer.fetchMultipleOptionsPrices(
//       instrumentIds, 
//       PlatformType.OKX
//     );
    
//     console.log('📝 测试结果:');
//     console.log('═'.repeat(60));
//     console.log(`平台: ${result.platform}`);
//     console.log(`错误信息: ${result.error || '无'}`);
//     console.log(`时间戳: ${result.timestamp ? new Date(result.timestamp).toISOString() : 'N/A'}`);
    
//     if (result.error) {
//       console.log(`❌ 获取失败: ${result.error}`);
//     } else {
//       console.log('✅ 获取成功!');
//       console.log('\n💰 期权价格详情:');
//       console.log('-'.repeat(40));
      
//       instrumentIds.forEach((instrumentId, index) => {
//         const price = result.prices[instrumentId];
//         console.log(`${index + 1}. ${instrumentId}`);
        
//         if (price !== null) {
//           console.log(`   价格: ${price}`);
//         } else {
//           console.log(`   价格: 暂无数据`);
//         }
//         console.log();
//       });
      
//       const validPrices = Object.values(result.prices).filter(price => price !== null);
//       const nullPrices = Object.values(result.prices).filter(price => price === null);
      
//       console.log('📊 统计信息:');
//       console.log(`   总合约数: ${instrumentIds.length}`);
//       console.log(`   有效价格: ${validPrices.length}`);
//       console.log(`   无效价格: ${nullPrices.length}`);
//     }
    
//     console.log('═'.repeat(60) + '\n');
    
//   } catch (error) {
//     console.error('❌ 测试过程中发生错误:', error);
//   }
// }

// /**
//  * 主函数
//  */
// async function main() {
//   console.log('🧪 期权价格获取测试脚本 (fetchMultipleOptionsPrices)');
//   console.log('═'.repeat(60));
//   console.log(`⏰ 测试时间: ${new Date().toISOString()}\n`);
  
//   try {
//     // 测试单个期权价格获取
//     await testSingleOptionPrice();
    
//     // 测试多个期权价格获取
//     await testMultipleOptionPrices();
    
//     // 原有的执行价格测试
//     console.log('\n' + '═'.repeat(60));
//     // console.log('🧪 期权执行价格测试 (fetchMultipleOptionExercisePrices)');
//     // console.log('═'.repeat(60) + '\n');
    
//     // 测试单个期权执行价格获取
//     // await testSingleOptionExercisePrice();
    
//     // 测试多个期权执行价格获取
//     // await testMultipleOptionExercisePrices();
    
//     console.log('\n✅ 所有测试完成!');
    
//   } catch (error) {
//     console.error('\n❌ 测试失败:', error);
//     process.exit(1);
//   }
// }

// // 运行测试
// main().catch(console.error);