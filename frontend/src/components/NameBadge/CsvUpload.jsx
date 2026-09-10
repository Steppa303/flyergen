import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, Check, Loader2, AlertCircle, Columns3, ArrowRight } from 'lucide-react';
import useNameBadgeStore from '../../store/useNameBadgeStore';

const TARGET_COLUMNS = [
  { key: 'vorname', label: 'Vorname', required: true },
  { key: 'nachname', label: 'Nachname', required: true },
  { key: 'behoerde', label: 'Behörde', required: true },
  { key: 'workshop', label: 'Workshop', required: false },
];

export default function CsvUpload() {
  const {
    participants, csvFileName, csvError,
    setParticipants, setCsvError,
  } = useNameBadgeStore();

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mappingState, setMappingState] = useState(null); // { headers, delimiter, file }
  const [columnMapping, setColumnMapping] = useState({});
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file, mapping = null) => {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvError('Bitte eine CSV-Datei auswählen');
      return;
    }

    setUploading(true);
    setCsvError(null);
    setPreview(null);
    if (!mapping) setMappingState(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (mapping) {
        formData.append('columnMapping', JSON.stringify(mapping));
      }

      const res = await fetch('/api/namebadge/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      // If auto-detect failed, show mapping UI (no participants yet)
      if (data.needsMapping) {
        setMappingState({
          headers: data.headers,
          delimiter: data.delimiter,
          file,
        });
        const guesses = {};
        for (const target of TARGET_COLUMNS) {
          const match = data.headers.find(h =>
            h.toLowerCase().includes(target.label.toLowerCase()) ||
            h.toLowerCase().includes(target.key)
          );
          if (match) guesses[target.key] = match;
        }
        setColumnMapping(guesses);
        setUploading(false);
        return;
      }

      if (!res.ok || !data.participants) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      setParticipants(data.participants, file.name);
      setPreview({
        total: data.total,
        delimiter: data.delimiter,
        firstRows: data.participants.slice(0, 5),
      });
      setMappingState(null);
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMappingConfirm = () => {
    if (!mappingState) return;
    // Validate all required columns are mapped
    const missing = TARGET_COLUMNS.filter(t => t.required && !columnMapping[t.key]);
    if (missing.length > 0) {
      setCsvError(`Bitte alle Pflichtspalten zuordnen: ${missing.map(m => m.label).join(', ')}`);
      return;
    }
    setCsvError(null);
    handleFileUpload(mappingState.file, columnMapping);
  };

  const handleMappingCancel = () => {
    setMappingState(null);
    setColumnMapping({});
    setCsvError(null);
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Teilnehmer-Liste hochladen</h2>

        {/* Upload Area */}
        {!mappingState && (
          <div
            className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-lime/40 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-lime" />
                <p className="text-white/50">CSV wird verarbeitet...</p>
              </div>
            ) : csvFileName ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-lime/10 rounded-full p-3">
                  <Check className="w-8 h-8 text-lime" />
                </div>
                <div>
                  <p className="text-white/70 font-medium">{csvFileName}</p>
                  <p className="text-white/40 text-sm">{participants.length} Teilnehmer geladen</p>
                </div>
                <p className="text-white/40 text-sm">Klicken zum Ändern</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="w-12 h-12 text-white/30" />
                <div>
                  <p className="text-white/70 font-medium">
                    CSV-Datei hier ablegen
                  </p>
                  <p className="text-white/40 text-sm mt-1">
                    oder klicken zum Auswählen (max. 5MB)
                  </p>
                </div>
                <div className="text-white/30 text-xs mt-2">
                  <p>Spalten: Vorname, Nachname, Behörde</p>
                  <p>Trennzeichen: Komma oder Semikolon (auto-erkannt)</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Column Mapping UI */}
        <AnimatePresence>
          {mappingState && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <Columns3 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 text-sm font-medium">Spalten zuordnen</p>
                  <p className="text-blue-400/70 text-sm mt-1">
                    Die Spaltenüberschriften konnten nicht automatisch erkannt werden.
                    Ordne die CSV-Spalten den Feldern zu.
                  </p>
                </div>
              </div>

              {/* Detected CSV headers */}
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white/40 text-xs mb-2">Erkannte Spalten in deiner CSV:</p>
                <div className="flex flex-wrap gap-2">
                  {mappingState.headers.map((h, i) => (
                    <span key={i} className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mapping dropdowns */}
              <div className="space-y-3">
                {TARGET_COLUMNS.map((target) => (
                  <div key={target.key} className="flex items-center gap-3">
                    <label className="text-white/60 text-sm w-24 flex-shrink-0">
                      {target.label}
                      {target.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                    <select
                      value={columnMapping[target.key] || ''}
                      onChange={(e) => setColumnMapping(prev => ({
                        ...prev,
                        [target.key]: e.target.value || undefined,
                      }))}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white/80 text-sm focus:border-lime/50 focus:outline-none"
                    >
                      <option value="">— Bitte wählen —</option>
                      {mappingState.headers.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleMappingConfirm}
                  disabled={uploading}
                  className="flex-1 bg-lime/20 hover:bg-lime/30 text-lime font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Zuordnung bestätigen
                    </>
                  )}
                </button>
                <button
                  onClick={handleMappingCancel}
                  disabled={uploading}
                  className="px-4 py-2 text-white/50 hover:text-white/70 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {csvError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{csvError}</p>
          </motion.div>
        )}
      </div>

      {/* Preview Table */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Vorschau (erste {preview.firstRows.length} von {preview.total})
            </h3>
            <span className="text-xs text-white/30">
              Trennzeichen: {preview.delimiter === ',' ? 'Komma' : 'Semikolon'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-white/50 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-white/50 font-medium">Vorname</th>
                  <th className="text-left py-2 px-3 text-white/50 font-medium">Nachname</th>
                  <th className="text-left py-2 px-3 text-white/50 font-medium">Behörde</th>
                  {preview.firstRows.some(r => r.workshop) && (
                    <th className="text-left py-2 px-3 text-white/50 font-medium">Workshop</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.firstRows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 text-white/30">{i + 1}</td>
                    <td className="py-2 px-3 text-white/80">{row.vorname}</td>
                    <td className="py-2 px-3 text-white/80">{row.nachname}</td>
                    <td className="py-2 px-3 text-white/60">{row.behoerde}</td>
                    {preview.firstRows.some(r => r.workshop) && (
                      <td className="py-2 px-3 text-white/60">{row.workshop || ''}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.total > 5 && (
            <p className="text-white/30 text-xs mt-3 text-center">
              ... und {preview.total - 5} weitere Teilnehmer
            </p>
          )}
        </motion.div>
      )}

      {/* CSV Format Info */}
      {!mappingState && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
            CSV-Format
          </h3>
          <div className="bg-white/5 rounded-xl p-4 font-mono text-sm text-white/60">
            <p>Vorname,Nachname,Behörde</p>
            <p>Max,Mustermann,Polizeiakademie Niedersachsen</p>
            <p>Erika,Musterfrau,Polizeidirektion Hannover</p>
          </div>
          <ul className="mt-3 text-white/40 text-sm space-y-1">
            <li>• Pflichtspalten: Vorname, Nachname, Behörde</li>
            <li>• Optionale Spalten: Workshop</li>
            <li>• Trennzeichen: Komma oder Semikolon (automatische Erkennung)</li>
            <li>• Encoding: UTF-8, Latin-1, Windows-1252 (automatische Erkennung)</li>
            <li>• Max. 500 Teilnehmer</li>
          </ul>
        </div>
      )}
    </div>
  );
}
