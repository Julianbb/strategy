import { ContentLayout } from "@/components/admin-panel/content-layout";

import {
    IconBrowserCheck,
    IconNotification,
    IconPalette,
    IconTool,
    IconUser,
  } from '@tabler/icons-react'

  import { Main } from '@/components/settings/main'
  import SidebarNav from '@/components/settings/sidebar-nav'

export default function ChatLayout({
  children
}: {
  children: React.ReactNode;
}) {
    return (
        <ContentLayout title="Settings">
            <Main fixed>
                <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
                <aside className='top-0 lg:sticky lg:w-1/5'>
                    <SidebarNav items={sidebarNavItems} />
                </aside>
                <div className='flex w-full overflow-y-hidden p-1'>
                    {children}
                </div>
                </div>
            </Main>
        </ContentLayout>
    );
}






const sidebarNavItems = [
    {
      title: 'Profile',
      icon: <IconUser size={18} />,
      href: '/dashboard/settings',
    },
    {
      title: 'Account',
      icon: <IconTool size={18} />,
      href: '/dashboard/settings/account',
    },
    {
      title: 'Appearance',
      icon: <IconPalette size={18} />,
      href: '/dashboard/settings/appearance',
    },
    {
      title: 'Notifications',
      icon: <IconNotification size={18} />,
      href: '/dashboard/settings/notifications',
    },
    {
      title: 'Display',
      icon: <IconBrowserCheck size={18} />,
      href: '/dashboard/settings/display',
    },
  ]