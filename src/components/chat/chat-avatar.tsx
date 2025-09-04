//src\components\chat\chat-avatar.tsx

import { User } from 'lucide-react';
import Image from 'next/image'; // <-- Step 1: Import the Image component
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

  // --- THIS IS THE CHANGE FOR THE ASSISTANT'S AVATAR ---
  return (
    <Avatar>
      {/* 
        Step 2: The AvatarImage component will automatically display the image.
        The 'src' path is relative to the 'public' folder.
      */}
      <AvatarImage src="icon.png" alt="GEIST Assistant Avatar" />
      
      {/* 
        Step 3: The AvatarFallback is now a backup that will only show
        if the image fails to load.
      */}
      <AvatarFallback className="bg-black border border-[#27F5D4]">
         {/* You can put a single letter here like 'G' for Geist as a fallback */}
         G
      </AvatarFallback>
    </Avatar>
  );
}