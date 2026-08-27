import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import useStore from '../store/useStore';
import { fetchTemplates } from '../api/client';
import TemplateGrid from '../components/TemplateGrid';

export default function HomePage() {
  const navigate = useNavigate();
  const { templates, setTemplates, selectTemplate, loading, setLoading, error, setError } =
    useStore();

  useEffect(() => {
    if (templates.length > 0) return;
    setLoading(true);
    fetchTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (template) => {
    selectTemplate(template);
    navigate(`/edit/${template.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      {/* Header */}
      <header className="px-6 py-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-lime" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Flyer<span className="text-lime">Gen</span>
          </h1>
        </motion.div>
        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/50 ml-[52px]"
        >
          Wähle ein Template und erstelle deinen Flyer
        </motion.p>
      </header>

      {/* Content */}
      <main className="px-6 pb-12 max-w-6xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-lime" />
          </div>
        )}

        {error && (
          <div className="glass-card p-6 text-center text-red-400">{error}</div>
        )}

        {!loading && !error && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <TemplateGrid templates={templates} onSelect={handleSelect} />
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
