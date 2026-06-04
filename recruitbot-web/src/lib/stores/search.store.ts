import { create } from 'zustand';
import type { SearchMode } from '@/features/search/types/search.types';

interface SearchStore {
  searchType: SearchMode;
  topK: number;
  bm25Weight: number;
  vectorWeight: number;
  setSearchType: (searchType: SearchMode) => void;
  setTopK: (topK: number) => void;
  setWeights: (bm25Weight: number, vectorWeight: number) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  searchType: 'endToEnd',
  topK: 10,
  bm25Weight: 50,
  vectorWeight: 50,
  setSearchType: (searchType) => set({ searchType }),
  setTopK: (topK) => set({ topK }),
  setWeights: (bm25Weight, vectorWeight) =>
    set({ bm25Weight, vectorWeight }),
  reset: () =>
    set({
      searchType: 'endToEnd',
      topK: 10,
      bm25Weight: 50,
      vectorWeight: 50,
    }),
}));
