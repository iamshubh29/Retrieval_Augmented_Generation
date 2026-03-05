'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const userId = 'demo-user-123';

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        userId={userId}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
      />
      <div className="flex-1 flex flex-col bg-gray-50">
        <ChatInterface
          conversationId={activeConversationId}
          userId={userId}
          onNewConversation={setActiveConversationId}
        />
      </div>
    </div>
  );
}
