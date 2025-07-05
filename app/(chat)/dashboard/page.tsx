
import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';
import { StrategyTypesSection } from '@/components/strategy-types-section';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }


  return (
      <div className="flex flex-col gap-6 p-6">
        <StrategyTypesSection />
      </div>
  );
}
