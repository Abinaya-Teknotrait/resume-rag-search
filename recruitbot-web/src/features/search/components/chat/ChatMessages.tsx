import { useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/stores/chat.store';
import { UserBubble } from './UserBubble';
import { BotBubble } from './BotBubble';
import { LoadingDots } from './LoadingDots';

export function ChatMessages() {
  const messages = useChatStore((state) => state.messages);
  const isSearching = useChatStore((state) => state.isSearching);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollElement = scrollContainerRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages, isSearching]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 space-y-5 overflow-y-auto px-8 py-6 scroll-smooth"
    >
      {messages.map((message) => (
        <div key={message.id}>
          {message.type === 'user' && message.text ? (
            <UserBubble text={message.text} timestamp={message.timestamp} />
          ) : message.type === 'bot' ? (
            <BotBubble timestamp={message.timestamp}>{message.content}</BotBubble>
          ) : null}
        </div>
      ))}

      {isSearching ? (
        <div className="flex justify-start">
          <BotBubble>
            <LoadingDots />
          </BotBubble>
        </div>
      ) : null}
    </div>
  );
}
