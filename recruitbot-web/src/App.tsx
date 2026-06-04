import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from '@/pages/UploadPage';
import SearchPage from '@/pages/SearchPage';
import { ChatPage } from '@/features/search/pages/ChatPage';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/search" element={<ChatPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/legacy-search" element={<SearchPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
