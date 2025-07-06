
import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';
import { StrategyTypesSection } from '@/components/strategy-types-section';
import { ContentLayout } from "@/components/admin-panel/content-layout";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }


  return (
    <ContentLayout title="Strategy Types">
      <div className="flex flex-col gap-6 p-6">
        <StrategyTypesSection />
      </div>
      </ContentLayout>
  );
}
