"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'
import { StrategyChat } from '@/lib/db/schema'

import { OverviewTab } from '@/components/dashboard/overview-tab'
import { PortfolioTab } from '@/components/dashboard/portfolio-tab'


export default function DashboardPage() {
  const sidebar = useStore(useSidebar, (x) => x);
  const [strategies, setStrategies] = useState<StrategyChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch('/api/strategy-chat/list');
        if (response.ok) {
          const data = await response.json();
          setStrategies(data);
        }
      } catch (error) {
        console.error('Error fetching strategies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  if (!sidebar) return null;

  return (
    <ContentLayout title="Dashboard">
      <div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='portfolio'>
                Portfolio
              </TabsTrigger>
              <TabsTrigger value='reports' disabled>
                Reports
              </TabsTrigger>
              <TabsTrigger value='notifications' disabled>
                Notifications
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <OverviewTab strategies={strategies} />
          </TabsContent>
          <TabsContent value='portfolio' className='space-y-4'>
            <PortfolioTab />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
