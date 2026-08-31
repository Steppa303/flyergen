import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileImage, Check, X, Loader2 } from 'lucide-react';
import useNameBadgeStore from '../../store/useNameBadgeStore';

export default function BackgroundSelector() {
  const {
    backgroundUrl, setBackground, setBackgroundMeta,
    hasBleed, setHasBleed, bleedSize, setBleedSize,
    doubleSided, setDoubleSided, backSideUrl, setBackSideUrl,
    setLoading, setError,
  } = useNameBadgeStore();

  const [activeTab, setActiveTab] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [backUploading, setBackUploading] = useState(false);
  const fileInputRef = useRef(null);
  const backFileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;

    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      setError('Nicht erlaubter Dateityp. Erlaubt: PDF, PNG, JPG');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('hasBleed', String(hasBleed));
      formData.append('bleedSize', String(bleedSize));

      const res = await fetch('/api/namebadge/upload-background', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload fehlgeschlagen' }));
        throw new Error(err.error || 'Upload fehlgeschlagen');
      }

      const data = await res.json();
      setBackground(data.backgroundUrl);
      setBackgroundMeta({ width: data.width, height: data.height });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBacksideUpload = async (file) => {
    if (!file) return;

    setBackUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/namebadge/upload-backside', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload fehlgeschlagen' }));
        throw new Error(err.error || 'Upload fehlgeschlagen');
      }

      const data = await res.json();
      setBackSideUrl(data.backSideUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setBackUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Hintergrund auswählen</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-lime text-navy-900'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Eigene Datei
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-lime text-navy-900'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <FileImage className="w-4 h-4 inline mr-2" />
            Vorlagen
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div
            className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-lime/40 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-lime" />
                <p className="text-white/50">Wird verarbeitet...</p>
              </div>
            ) : backgroundUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={backgroundUrl}
                    alt="Hintergrund"
                    className="max-h-64 rounded-lg mx-auto shadow-lg"
                  />
                  <div className="absolute top-2 right-2 bg-lime text-navy-900 rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-white/50 text-sm">Klicken zum Ändern</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-white/30" />
                <div>
                  <p className="text-white/70 font-medium">
                    PDF, PNG oder JPG hier ablegen
                  </p>
                  <p className="text-white/40 text-sm mt-1">
                    oder klicken zum Auswählen (max. 20MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="text-center py-12 text-white/40">
            <FileImage className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Vorlagen verfügbar.</p>
            <p className="text-sm mt-1">Verwende den Upload-Tab für eigene Hintergründe.</p>
          </div>
        )}
      </div>

      {/* Bleed Options */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Beschnittzugabe
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasBleed}
            onChange={(e) => setHasBleed(e.target.checked)}
            className="w-5 h-5 rounded accent-lime"
          />
          <span className="text-white/70">Beschnittzugabe vorhanden</span>
        </label>
        {hasBleed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 ml-8"
          >
            <label className="label-text">Zugabe in mm</label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={bleedSize}
              onChange={(e) => setBleedSize(parseFloat(e.target.value) || 0)}
              className="input-field w-32"
              placeholder="z.B. 2"
            />
          </motion.div>
        )}
      </div>

      {/* Double-sided Option */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Beidseitiger Druck
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={doubleSided}
            onChange={(e) => setDoubleSided(e.target.checked)}
            className="w-5 h-5 rounded accent-lime"
          />
          <span className="text-white/70">Beidseitig drucken</span>
        </label>
        {doubleSided && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4"
          >
            <label className="label-text">Rückseiten-Grafik</label>
            <div
              className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-lime/40 transition-colors cursor-pointer"
              onClick={() => backFileInputRef.current?.click()}
            >
              <input
                ref={backFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleBacksideUpload(e.target.files[0])}
              />
              {backUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-lime mx-auto" />
              ) : backSideUrl ? (
                <div className="relative inline-block">
                  <img
                    src={backSideUrl}
                    alt="Rückseite"
                    className="max-h-40 rounded-lg mx-auto"
                  />
                  <div className="absolute top-2 right-2 bg-lime text-navy-900 rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-white/30" />
                  <p className="text-white/50 text-sm">Rückseiten-Grafik hochladen</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
