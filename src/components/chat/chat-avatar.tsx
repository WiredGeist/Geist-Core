//src\components\chat\chat-avatar.tsx

import { User } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatAvatarProps {
  role: 'user' | 'assistant';
}

export function ChatAvatar({ role }: ChatAvatarProps) {
  if (role === 'user') {
    return (
      <Avatar>
        <AvatarFallback className="bg-secondary text-secondary-foreground">
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar>
      <AvatarImage src="icon.png" alt="GEIST Assistant Avatar" />
      <AvatarFallback className="bg-black border border-[#27F5D4]">
         G
      </AvatarFallback>
    </Avatar>
  );
}