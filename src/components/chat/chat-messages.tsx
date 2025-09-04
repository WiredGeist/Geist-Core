//src\components\chat\chat-messages.tsx

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chat-store';
import { Skeleton } from '@/components/ui/skeleton';
import { WelcomeMessage } from './welcome-message';

export function ChatMessages() {
  const { activeConversation, isLoading } = useChatStore(state => ({
    activeConversation: state.activeConversationId ? state.conversations[state.activeConversationId] : null,
    isLoading: state.isLoading,
  }));
  
  // STEP 1: We only need one ref for the element at the bottom.
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = activeConversation?.messages ?? [];

  // STEP 2: Simplify the useEffect hook to trigger whenever 'messages' changes.
  useEffect(() => {
    // This tells the browser to smoothly scroll our invisible bottom element into view.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // The dependency array now only needs to watch for changes in the messages list.

  return (
    <ScrollArea className="h-full">
        <div className="p-4 md:p-6 space-y-6">
            {messages.length === 0 && !isLoading ? (
                <WelcomeMessage />
            ) : (
                messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))
            )}
            {isLoading && (
              <div className="flex items-start gap-4 max-w-4xl mx-auto flex-row-reverse">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            )}
            {/* STEP 3: Place the invisible element with the ref at the very end of the list. */}
            <div ref={bottomRef} />
        </div>
    </ScrollArea>
  );
}