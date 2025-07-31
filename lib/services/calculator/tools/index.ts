// 期权计算器
export {
  OptionPortfolioCalculator
} from './options';

export type {
  OptionTrade,
  OptionValue,
  PortfolioSummary
} from './options';

// 永续合约计算器
export {
  SimplePerpetualCalculator
} from './perpetual';

export type {
  PerpetualTrade,
  PerpetualValue,
  PerpetualPortfolioSummary
} from './perpetual';

// 现货计算器
export {
  SimpleSpotCalculator
} from './spot';

export type {
  SpotTrade,
  SpotValue,
  SpotPortfolioSummary
} from './spot';

// 计算器管理器
export {
  CalculatorManager,
  createCalculatorManager,
  isOptionTrade,
  isPerpetualTrade,
  isSpotTrade,
  isOptionsPortfolioSummary,
  isPerpetualPortfolioSummary,
  isSpotPortfolioSummary
} from './calculator-manager';

export type {
  CalculatorType,
  UnifiedTrade,
  UnifiedPortfolioSummary,
  CalculatorConfig,
  ICalculatorManager
} from './calculator-manager';