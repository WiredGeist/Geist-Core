'use client';

import { cn } from '@/lib/utils';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Check, X } from 'lucide-react'; // REMOVED: 'Play' icon is no longer needed
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatStore, type Message } from '@/stores/chat-store';
import React, { useState } from 'react';
import { Textarea } from '../ui/textarea';

interface ChatMessageProps {
  message: Message;
}

const CodeBlock = ({ code }: { code: string }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            toast({ title: "Code block copied!" });
            setTimeout(() => setIsCopied(false), 2000); // Revert icon after 2 seconds
        } catch (err) {
            console.error('Failed to copy code: ', err);
            toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code to clipboard." });
        }
    };

    return (
        <div className="relative my-2">
            <pre className="bg-background font-code p-4 rounded-md overflow-x-auto text-sm text-foreground/80 border">
                <code>{code}</code>
            </pre>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
            >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const { editMessageAndResubmit } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  
  const { toast } = useToast();
  const [isMessageCopied, setIsMessageCopied] = useState(false);


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleSave = () => {
    if (!editedContent.trim()) return;
    editMessageAndResubmit(message.id, editedContent);
    setIsEditing(false);
  };

  const handleCopyMessage = async () => {
    try {
        await navigator.clipboard.writeText(message.content);
        setIsMessageCopied(true);
        toast({ title: "Message copied!" });
        setTimeout(() => setIsMessageCopied(false), 2000);
    } catch (err) {
        console.error('Failed to copy message: ', err);
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy message to clipboard." });
    }
  };


  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (!part || part.trim() === '') return null;

      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3).trim();
        return <CodeBlock key={index} code={codeContent} />;
      }
      
      const lines = part.trim().split('\n').map((line, i) => {
          if (line.match(/^\s*[*+-]\s/)) {
              return <li key={i}>{line.replace(/^\s*[*+-]\s/, '')}</li>
          }
          return <React.Fragment key={i}>{line}<br/></React.Fragment>;
      });

      const listItems = lines.filter(el => el.type === 'li');
      const otherContent = lines.filter(el => el.type !== 'li');

      return (
        <div key={index}>
            <p className="whitespace-pre-wrap leading-relaxed">{otherContent}</p>
            {listItems.length > 0 && <ul className="list-disc pl-5 mt-2 space-y-1">{listItems}</ul>}
        </div>
      );
    });
  };

  return (
    <div className={cn('flex items-start gap-4 max-w-4xl mx-auto my-4', isAssistant && 'flex-row-reverse')}>
      <ChatAvatar role={message.role} />
      <div className="group flex-1">
        <div className={cn('rounded-lg p-4 text-sm', isAssistant ? 'bg-black border border-[#27F5D4]' : 'bg-secondary' )}>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea 
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSave}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
                renderContent(message.content)
            )}
        </div>
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider delayDuration={0}>
                {isAssistant ? (
                    <>
                        {/* REMOVED: The entire Tooltip wrapper for the Play/TTS button has been deleted. */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleCopyMessage}>
                               {isMessageCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Copy message</p></TooltipContent>
                        </Tooltip>
                    </>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleEdit}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Edit message</p></TooltipContent>
                    </Tooltip>
                )}
            </TooltipProvider>
        </div>
      </div>
    </div>
  );
}