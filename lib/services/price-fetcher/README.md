# 多平台价格服务架构

本价格服务已重构为支持多个交易平台的可扩展架构，能够从不同平台获取价格数据，并提供平台故障时的自动回退机制。

## 🚀 主要特性

### 多平台支持
- **OKX**: 支持现货和期权价格，提供标记价格API、DAL监控等功能
- **Binance**: 支持现货价格，提供期货、保证金交易等功能
- **可扩展**: 易于添加新的交易平台（Deribit、Bybit等）

### 智能回退机制
- 自动检测平台健康状态
- 主平台不可用时自动切换到备用平台
- 支持指定首选平台

### 平台特性检测
- 自动检测平台支持的功能（现货、期权、实时数据等）
- 当平台不支持期权时自动降级为仅现货价格

## 📁 架构概览

```
lib/3party/
│   ├── types.ts              # 平台接口定义
│   ├── base-adapter.ts       # 基础适配器类
│   ├── platform-manager.ts   # 平台管理器
│   ├── okx-adapter.ts        # OKX平台适配器
│   ├── binance-adapter.ts    # Binance平台适配器
│   └── index.ts              # 平台导出
├── examples/
│   └── usage.ts              # 使用示例
├── config.ts                 # 配置管理
├── price-service.server.ts   # 服务端价格服务
├── price-service.client.ts   # 客户端价格服务
├── price-service.ts          # 接口定义
└── README.md                 # 说明文档
```

## 🛠️ 使用方法

### 基础用法

```typescript
import { priceServiceServer } from './price-service.server';

// 获取BTC现货价格（使用默认平台）
const priceData = await priceServiceServer.fetchPriceData('BTC');
console.log('BTC价格:', priceData.currencyPrice);
console.log('使用平台:', priceData.platform);
```

### 获取期权价格

```typescript
// 同时获取现货和期权价格
const optionInstrument = 'BTC-USD-250725-50000-C';
const priceData = await priceServiceServer.fetchPriceData('BTC', optionInstrument);

console.log('BTC现货价格:', priceData.currencyPrice);
console.log('期权价格:', priceData.optionsPrice);
```

### 指定平台

```typescript
import { PlatformType } from '@/lib/3party/types';

// 强制使用Binance平台
const priceData = await priceServiceServer.fetchPriceData(
  'ETH', 
  null, 
  PlatformType.BINANCE
);
```

### 平台管理

```typescript
// 获取可用平台
const available = await priceServiceServer.getAvailablePlatforms();

// 获取健康的平台
const healthy = await priceServiceServer.getHealthyPlatforms();

// 设置主平台
await priceServiceServer.setPrimaryPlatform(PlatformType.OKX);
```

## 🔧 平台特性

### OKX平台
- ✅ 现货价格
- ✅ 期权价格（标记价格）
- ✅ 资金费率
- ✅ 期权链数据
- ✅ 实时数据
- ✅ 历史数据

### Binance平台
- ✅ 现货价格
- ❌ 期权价格（不支持传统期权）
- ✅ 期货价格
- ✅ 24小时统计
- ✅ K线数据
- ✅ 订单簿

## 🚀 扩展新平台

要添加新的交易平台，只需：

1. 创建新的适配器类继承`BasePlatformAdapter`
2. 实现必需的方法
3. 在平台管理器中注册

```typescript
export class NewPlatformAdapter extends BasePlatformAdapter {
  readonly name = 'NewPlatform';
  readonly features: PlatformFeatures = {
    // 定义平台特性
  };

  async fetchSpotPrice(baseCurrency: string): Promise<number | null> {
    // 实现现货价格获取
  }

  async fetchPrices(baseCurrency: string, optionInstrument?: string): Promise<PlatformPriceData> {
    // 实现价格数据获取
  }
}
```

## ⚡ 性能特性

- **请求限流**: 每个平台都有配置的请求限制
- **超时控制**: 可配置的请求超时时间
- **重试机制**: 指数退避重试策略
- **并发处理**: 支持并行请求多个价格

## 🔒 错误处理

- 网络错误自动重试
- 平台不可用时自动回退
- 详细的错误信息和日志
- 优雅降级（期权不支持时仅返回现货价格）

## 📊 数据格式

```typescript
interface PriceData {
  currencyPrice: number | null;    // 现货价格
  optionsPrice: number | null;     // 期权价格
  optionInstrument: string | null; // 期权合约
  error: string | null;            // 错误信息
  platform?: string;               // 使用的平台
  timestamp?: number;              // 时间戳
}
```

## 🎯 未来扩展

- [ ] Deribit平台支持
- [ ] Bybit平台支持
- [ ] WebSocket实时数据流
- [ ] 价格缓存机制
- [ ] 历史价格数据API
- [ ] 价格预警功能