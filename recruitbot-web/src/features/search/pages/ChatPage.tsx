import { useState } from 'react';
import { useSearchStore } from '@/lib/stores/search.store';
import { useChatStore } from '@/lib/stores/chat.store';
import { useCandidateModal } from '@/hooks/use-candidate-modal';
import { searchResumes } from '@/features/search/services/search.service';
import type { IResumeSearchResult } from '@/features/search/types/search.types';
import { ChatTopbar } from '@/features/search/components/chat/ChatTopbar';
import { ChatMessages } from '@/features/search/components/chat/ChatMessages';
import { ChatInputBar } from '@/features/search/components/chat/ChatInputBar';
import { WelcomeMessage } from '@/features/search/components/chat/WelcomeMessage';
import { SuggestionChips } from '@/features/search/components/chat/SuggestionChips';
import { BotBubble } from '@/features/search/components/chat/BotBubble';
import { ResultsList } from '@/features/search/components/results/ResultsList';
import { CandidateModal } from '@/features/search/components/modal/CandidateModal';
import { Sidebar } from '@/features/search/components/sidebar/Sidebar';

export function ChatPage() {
  const [error, setError] = useState<string | null>(null);

  // Search store
  const searchType = useSearchStore((state) => state.searchType);
  const topK = useSearchStore((state) => state.topK);
  const bm25Weight = useSearchStore((state) => state.bm25Weight);
  const vectorWeight = useSearchStore((state) => state.vectorWeight);

  // Chat store
  const messages = useChatStore((state) => state.messages);
  const addUserMessage = useChatStore((state) => state.addUserMessage);
  const addBotMessage = useChatStore((state) => state.addBotMessage);
  const setIsSearching = useChatStore((state) => state.setIsSearching);
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Candidate modal
  const { isOpen, candidate, loading, openCandidateModal, closeModal } = useCandidateModal();

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setError(null);
    addUserMessage(query);
    setIsSearching(true);

    try {
      const response = await searchResumes(
        query,
        searchType,
        topK,
        searchType === 'hybrid'
          ? {
              bm25: bm25Weight / 100,
              vector: vectorWeight / 100,
            }
          : undefined
      );

      if (!response.results || response.results.length === 0) {
        addBotMessage(
          <ResultsList results={[]} searchType={searchType} duration={response.durationMs || 0} query={query} />
        );
        setIsSearching(false);
        return;
      }

      const resultsContent = (
        <ResultsList
          results={response.results}
          searchType={searchType}
          duration={response.durationMs || 0}
          query={query}
          onCandidateClick={(candidateId: string) => {
            openCandidateModal(candidateId);
          }}
        />
      );

      addBotMessage(resultsContent);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      addBotMessage(
        <div className="text-red-300">
          <p className="font-semibold">Search Error</p>
          <p className="mt-1 text-sm">{errorMsg}</p>
        </div>
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestion = (query: string) => {
    handleSearch(query);
  };

  const handleClear = () => {
    clearMessages();
    setIsSearching(false);
    setError(null);
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <div className="flex h-screen gap-4 overflow-hidden bg-slate-950 p-4">
        <Sidebar onClear={handleClear} />

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 shadow-xl">
          <ChatTopbar />

          {isEmpty ? (
            <div className="flex-1 space-y-6 overflow-y-auto px-8 py-8">
              <WelcomeMessage />
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-300">Try one of these searches:</p>
                <SuggestionChips onSuggest={handleSuggestion} />
              </div>
            </div>
          ) : (
            <ChatMessages />
          )}

          <ChatInputBar onSubmit={handleSearch} isDisabled={isEmpty && messages.length === 0 ? false : false} />
        </div>
      </div>

      <CandidateModal isOpen={isOpen} candidate={candidate} loading={loading} error={error} onClose={closeModal} />
    </>
  );
}
