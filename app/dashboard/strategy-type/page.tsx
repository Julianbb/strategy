
import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';
import { StrategyTypesProvider } from '@/components/strategy-types/strategy-types-context';
import { StrategyTypesSection } from '@/components/strategy-types/strategy-types-section';
import { StrategyTypesDialogs } from '@/components/strategy-types/strategy-types-dialogs';
import { ContentLayout } from "@/components/admin-panel/content-layout";

export default async function Page() {
  return (
    <ContentLayout title="Strategy Types">
      <StrategyTypesProvider>
        <div className="flex flex-col gap-6">
          <StrategyTypesSection />
        </div>
        <StrategyTypesDialogs />
      </StrategyTypesProvider>
    </ContentLayout>
  );
}
