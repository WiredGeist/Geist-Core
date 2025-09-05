'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GeistLogo } from '@/components/geist-logo';
import { Button } from '@/components/ui/button';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { MessageSquare, Settings, PlusCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { ChatHistoryList } from './chat/chat-history-list';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';

const navItems = [
  { href: '/', icon: MessageSquare, label: 'Chat' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { startNewConversation } = useChatStore();
  const { isCollapsed: isCollapsedFromStore, toggleSidebar } = useSidebarStore();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isCollapsed = isMounted ? isCollapsedFromStore : false;

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full flex flex-col bg-secondary/30 border-r border-border p-4 transition-all duration-300 ease-in-out z-10',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className={cn("p-2 mb-4", isCollapsed && "px-0 text-center flex justify-center")}>
        <Link href="/">
          {!isCollapsed && <GeistLogo className="text-foreground" />}
        </Link>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <TooltipProvider key={item.href} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={item.href} className={cn(
                      buttonVariants({ variant: pathname === item.href ? 'secondary' : 'ghost' }),
                      "w-full h-11", isCollapsed ? "justify-center" : "justify-start text-base"
                    )}>
                      <item.icon className={cn(isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5")} />
                      <span className={cn(isCollapsed && "sr-only")}>{item.label}</span>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          ))}
        </nav>

        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn("w-full h-11", isCollapsed && "justify-center")}
                        onClick={startNewConversation}
                        >
                        <PlusCircle className={cn("h-4 w-4", !isCollapsed && "mr-2")}/>
                        <span className={cn(isCollapsed && "sr-only")}>New Chat</span>
                    </Button>
                </TooltipTrigger>
                 {isCollapsed && <TooltipContent side="right"><p>New Chat</p></TooltipContent>}
            </Tooltip>
        </TooltipProvider>


        {!isCollapsed && <ChatHistoryList />}
      </div>

      <div className="mt-auto">
        <div className="border-t border-border -mx-4 my-2"></div>
        <div className="flex items-center justify-between">
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                <TooltipTrigger asChild>
                    <Link href="/settings" className={cn(
                        buttonVariants({ variant: 'ghost', size: isCollapsed ? 'icon' : 'default' }),
                        isCollapsed && "w-full"
                    )}>
                        <Settings className="h-5 w-5" />
                        <span className={cn('ml-2', isCollapsed && "sr-only")}>Settings</span>
                    </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right"><p>Settings</p></TooltipContent>}
                </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
    </aside>
  );
}