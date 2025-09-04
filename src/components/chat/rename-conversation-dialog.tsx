'use client';

import { useChatStore } from '@/stores/chat-store';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface RenameConversationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    conversationId: string;
}

export const RenameConversationDialog = ({ isOpen, onOpenChange, conversationId }: RenameConversationDialogProps) => {
  const { conversations, renameConversation } = useChatStore();
  const conversation = conversations[conversationId];
  const [name, setName] = useState('');

  useEffect(() => {
    if(conversation) {
        setName(conversation.name);
    }
  }, [conversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
        renameConversation(conversationId, name.trim());
        onOpenChange(false);
    }
  };

  if (!conversation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
          <DialogDescription>
            Enter a new name for your conversation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Conversation name"
                className="mt-4"
            />
            <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
