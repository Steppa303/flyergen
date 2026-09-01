import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw, Download, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useNameBadgeStore from '../store/useNameBadgeStore';
import BackgroundSelector from '../components/NameBadge/BackgroundSelector';
import CsvUpload from '../components/NameBadge/CsvUpload';
import BadgeCanvas from '../components/NameBadge/BadgeCanvas';
import TextFieldConfig from '../components/NameBadge/TextFieldConfig';
import ParticipantTable from '../components/NameBadge/ParticipantTable';
import BadgePreview from '../components/NameBadge/BadgePreview';

const STEPS = [
  { num: 1, label: 'Hintergrund' },
  { num: 2, label: 'CSV-Upload' },
  { num: 3, label: 'Platzierung' },
  { num: 4, label: 'Generierung' },
];

export default function NameBadgePage() {
  const navigate = useNavigate();
  const {
    currentStep, nextStep, prevStep, reset,
    backgroundUrl, participants, fields,
    loading, error, setLoading, setError,
    setDownloadUrl, downloadUrl,
    doubleSided, backSideUrl, badgeSize,
  } = useNameBadgeStore();

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!backgroundUrl;
      case 2: return participants.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const res = await fetch('/api/namebadge/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundUrl,
          doubleSided,
          backSideUrl,
          participants,
          fields,
          badgeSize: { width: 105, height: 148 },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Rendering fehlgeschlagen' }));
        throw new Error(errData.error || 'Rendering fehlgeschlagen');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    const today = new Date().toISOString().split('T')[0];
    a.download = `namensschilder_${today}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col"
    >
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lime" />
            <h1 className="text-lg font-bold">Namensschild-Generator</h1>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          title="Zurücksetzen"
        >
          <RotateCcw className="w-5 h-5 text-white/70" />
        </button>
      </header>

      {/* Step Indicator */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-2xl mx-auto">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => step.num < currentStep && useNameBadgeStore.getState().goToStep(step.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentStep === step.num
                    ? 'bg-lime text-navy-900'
                    : currentStep > step.num
                    ? 'bg-lime/20 text-lime cursor-pointer hover:bg-lime/30'
                    : 'bg-white/5 text-white/40'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">
                  {step.num}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${currentStep > step.num ? 'bg-lime/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 pb-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <BackgroundSelector />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <CsvUpload />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col lg:flex-row gap-6"
            >
              <div className="lg:w-2/3 space-y-4">
                <BadgeCanvas />
                <BadgePreview />
              </div>
              <div className="lg:w-1/3 space-y-4">
                <TextFieldConfig />
                <ParticipantTable />
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-lg mx-auto text-center space-y-6 py-12"
            >
              <div className="glass-card p-8 space-y-6">
                <h2 className="text-xl font-bold">Namensschilder generieren</h2>
                <p className="text-white/60">
                  {participants.length} Namensschilder werden als PDF generiert.
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="w-10 h-10 animate-spin text-lime" />
                    <p className="text-white/50">Namensschilder werden generiert...</p>
                  </div>
                ) : downloadUrl ? (
                  <div className="space-y-4">
                    <div className="text-lime text-lg font-semibold">
                      ✓ PDF erfolgreich generiert!
                    </div>
                    <button
                      onClick={handleDownload}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      PDF herunterladen
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Alle generieren
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      {currentStep < 4 && (
        <div className="px-4 sm:px-6 py-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Zurück
            </button>
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              Weiter
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
