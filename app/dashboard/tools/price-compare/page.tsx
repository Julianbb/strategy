
import { PriceCompareProvider } from '@/components/price-compare/price-compare-context';
import { PriceCompareSection } from '@/components/price-compare/price-compare-section';
import { PriceCompareDialogs } from '@/components/price-compare/dialogs/price-compare-dialogs';

export default function PriceCompare() {
  return (
    <PriceCompareProvider>
      <PriceCompareSection />
      <PriceCompareDialogs />
    </PriceCompareProvider>
  );
}