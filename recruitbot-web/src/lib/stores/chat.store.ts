import { create } from 'zustand';
import type { Message } from '@/types/chat.types';

interface ChatState {
  messages: Message[];
  isSearching: boolean;
  addUserMessage: (text: string) => void;
  addBotMessage: (content: React.ReactNode) => void;
  setIsSearching: (isSearching: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isSearching: false,
  addUserMessage: (text) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'user',
          text,
          timestamp: new Date(),
        },
      ],
    })),
  addBotMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'bot',
          content,
          timestamp: new Date(),
        },
      ],
    })),
  setIsSearching: (isSearching) => set({ isSearching }),
  clearMessages: () => set({ messages: [], isSearching: false }),
}));
