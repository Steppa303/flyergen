import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/edit/:templateId" element={<EditorPage />} />
      </Routes>
    </AnimatePresence>
  );
}
