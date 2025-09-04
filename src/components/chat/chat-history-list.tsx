//src\components\chat\chat-history-list.tsx

'use client';
import { useChatStore } from '@/stores/chat-store';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { MessageSquare, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { RenameConversationDialog } from './rename-conversation-dialog';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const ChatHistoryList = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    deleteConversation,
  } = useChatStore();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);

  const sortedConversations = Object.values(conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const handleRenameClick = (conversationId: string) => {
    setConversationToRename(conversationId);
    setRenameDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-2 mt-4 flex-1 min-h-0">
        <h3 className="text-xs font-semibold text-muted-foreground px-2">
          History
        </h3>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 pr-2">
            {sortedConversations.map((convo) => (
              <div
                key={convo.id}
                className={cn(
                  'flex items-center group rounded-md',
                  convo.id === activeConversationId ? 'bg-secondary' : 'hover:bg-secondary/80'
                )}
              >
                <Button
                  variant={'ghost'}
                  className="w-full justify-start text-sm truncate h-9"
                  onClick={() => setActiveConversation(convo.id)}
                >
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{convo.name}</span>
                </Button>

                {convo.id === activeConversationId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-50 group-hover:opacity-100 shrink-0 mr-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleRenameClick(convo.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteConversation(convo.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      {conversationToRename && (
        <RenameConversationDialog
          isOpen={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          conversationId={conversationToRename}
        />
      )}
    </>
  );
};
