//src\components\chat\chat-input.tsx


'use client';
import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendHorizonal, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onFileSelect, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset file input value to allow selecting the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleFileClick}
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Attach a document (.txt, .md)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.md"
      />

      <Textarea
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        className="min-h-[40px] flex-1 resize-none pr-16"
        disabled={isLoading}
      />

      <Button
        size="icon"
        onClick={handleSend}
        disabled={isLoading || !message.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <SendHorizonal className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}