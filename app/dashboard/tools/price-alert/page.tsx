
import { PriceAlertsProvider } from '@/components/price-alerts/price-alerts-context';
import { PriceAlertsSection } from '@/components/price-alerts/price-alerts-section';
import { PriceAlertsDialogs } from '@/components/price-alerts/price-alerts-dialogs';

export default function PriceAlert() {
  return (
    <PriceAlertsProvider>
      <PriceAlertsSection />
      <PriceAlertsDialogs />
    </PriceAlertsProvider>
  );
}