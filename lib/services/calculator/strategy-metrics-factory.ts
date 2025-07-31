import { StrategyMetricsCalculator, StrategyMetricsCalculatorFactory } from './strategy-metrics'
import { OptionPerpetualStrategyCalculator } from './strategy-calculator-option-perpetual'
import { FundingRateStrategyCalculator } from './strategy-calculator-funding-rate'

export class StrategyMetricsFactory implements StrategyMetricsCalculatorFactory {
  private calculators: Map<string, StrategyMetricsCalculator> = new Map();

  constructor() {
    // Register specific strategy type calculators
    this.calculators.set('ce85531b-0ba3-457d-af67-085fb91ef84b', new OptionPerpetualStrategyCalculator());
    this.calculators.set('2755bf2c-9ff7-4390-a1ff-004db8e1de2c', new OptionPerpetualStrategyCalculator());
    this.calculators.set('08a003df-1efd-420c-abab-473947af6400', new OptionPerpetualStrategyCalculator());
    this.calculators.set('08be40dd-4413-43e4-9ea3-8935f0847280', new OptionPerpetualStrategyCalculator());
    this.calculators.set('13514b66-5d5d-466f-af8d-bdb376bbfa71', new FundingRateStrategyCalculator());
  }

  getCalculator(strategyType: string): StrategyMetricsCalculator {
    const calculator = this.calculators.get(strategyType);
    
    if (!calculator) {
      throw new Error(`No calculator found for strategy type: ${strategyType}`);
    }
    
    return calculator;
  }

  registerCalculator(strategyType: string, calculator: StrategyMetricsCalculator): void {
    this.calculators.set(strategyType, calculator);
  }
}

export const strategyMetricsFactory = new StrategyMetricsFactory();