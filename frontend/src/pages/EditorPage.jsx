import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { fetchTemplate, renderFlyer } from '../api/client';
import FormField from '../components/FormField';
import Preview from '../components/Preview';
import ExportButtons from '../components/ExportButtons';
import ImageUpload from '../components/ImageUpload';

export default function EditorPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const {
    selectedTemplate,
    selectTemplate,
    formData,
    updateField,
    hiddenFields,
    toggleFieldHidden,
    exportFilename,
    setExportFilename,
    previewUrl,
    setPreviewUrl,
    renderLoading,
    setRenderLoading,
    error,
    setError,
    loading,
    setLoading,
    selectedFormat,
    setSelectedFormat,
    formats,
  } = useStore();

  const debounceRef = useRef(null);

  // Load template if not already selected
  useEffect(() => {
    if (selectedTemplate?.id === templateId) return;
    setLoading(true);
    fetchTemplate(templateId)
      .then(selectTemplate)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [templateId]);

  // Auto-render preview on data change (debounced)
  const triggerRender = useCallback(() => {
    if (!selectedTemplate) return;
    setRenderLoading(true);
    setError(null);

    // Filter out hidden fields
    const filteredData = Object.fromEntries(
      Object.entries(formData).filter(([key]) => !hiddenFields[key])
    );

    renderFlyer(selectedTemplate.id, filteredData, 'png', selectedFormat)
      .then((blob) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch((err) => setError(err.message))
      .finally(() => setRenderLoading(false));
  }, [selectedTemplate, formData, hiddenFields, selectedFormat]);

  useEffect(() => {
    if (!selectedTemplate) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(triggerRender, 800);
    return () => clearTimeout(debounceRef.current);
  }, [formData, selectedTemplate, selectedFormat]);

  // Manual refresh
  const handleRefresh = () => {
    clearTimeout(debounceRef.current);
    triggerRender();
  };

  // Export handler
  const handleExport = async (format) => {
    if (!selectedTemplate) return;
    setRenderLoading(true);
    try {
      // Filter out hidden fields
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key]) => !hiddenFields[key])
      );

      const blob = await renderFlyer(selectedTemplate.id, filteredData, format, selectedFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (exportFilename || 'flyer').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setRenderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Template wird geladen …</div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">{error || 'Template nicht gefunden'}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col"
    >
      {/* Top Bar */}
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
            <h1 className="text-lg font-bold">{selectedTemplate.name}</h1>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={renderLoading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Vorschau aktualisieren"
        >
          <RefreshCw className={`w-5 h-5 text-white/70 ${renderLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Left: Form */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:w-1/2 space-y-5"
        >
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Felder bearbeiten
            </h2>
            {selectedTemplate.fields.map((field) => (
              <FormField
                key={field.id}
                field={field}
                value={formData[field.id]}
                onChange={updateField}
                hidden={!!hiddenFields[field.id]}
                onToggleHidden={toggleFieldHidden}
              />
            ))}
            
            {/* Bild-Upload */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-white/70 mb-2">Flyer-Bild</label>
              <ImageUpload
                currentImage={formData.imageUrl}
                onImageSelect={(url) => updateField('imageUrl', url)}
              />
            </div>
          </div>

          {/* Export */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
              Exportieren
            </h2>
            <ExportButtons
              onExport={handleExport}
              loading={renderLoading}
              hasPreview={!!previewUrl}
              filename={exportFilename}
              onFilenameChange={setExportFilename}
            />
          </div>
        </motion.div>

        {/* Right: Preview */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:w-1/2 lg:sticky lg:top-6 lg:self-start space-y-4"
        >
          {/* Format Tabs */}
          {formats.length > 0 && (
            <div className="flex gap-2">
              {formats.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFormat === fmt.id
                      ? 'bg-lime text-black'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          )}
          <Preview
            previewUrl={previewUrl}
            loading={renderLoading}
            error={error}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
