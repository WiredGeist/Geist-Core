
'use client';

import { Sidebar } from '@/components/sidebar';
import { useSidebarStore } from '@/stores/sidebar-store';
import { cn } from '@/lib/utils';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main
        className={cn(
          'flex-1 flex flex-col overflow-y-auto transition-[margin-left] duration-300 ease-in-out',
          isCollapsed ? 'ml-20' : 'ml-72'
        )}
      >
        {children}
      </main>
    </div>
  );
}
