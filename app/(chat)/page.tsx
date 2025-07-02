
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { StrategyTypesSection } from '@/components/strategy-types-section';
import { SidebarToggle } from '@/components/sidebar-toggle';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }


  return (
    <>
      <div className="items-center gap-2 p-2 flex lg:hidden">
        <SidebarToggle />
      </div>
      <div className="flex flex-col gap-6 p-6">
        <StrategyTypesSection />
      </div>
    </>
  );
}
