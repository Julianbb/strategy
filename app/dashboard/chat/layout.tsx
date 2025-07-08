'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from "@/components/admin-panel/navbar";

export default function ChatLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isIdRoute = pathname.includes('/chat/') && pathname.split('/').length > 3;

  // On mobile, if it's an [id] route, render without layout
  if (isIdRoute) {
    return (
      <div>
        {/* Show navbar only on desktop for [id] routes */}
        <div className="hidden md:block">
          <Navbar title={"Strategies"} />
        </div>
        
        {/* No container padding on mobile for [id] routes */}
        <div className="md:container md:py-8  md:px-8">
          {children}
        </div>
      </div>
    );
  }

  // Default layout for /chat page
  return (
    <div>
      <Navbar title={"Strategies"} />
      <div className="container py-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
