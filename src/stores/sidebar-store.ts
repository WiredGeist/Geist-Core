
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    }),
    {
      name: 'geist-sidebar-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
