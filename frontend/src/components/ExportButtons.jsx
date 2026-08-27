import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import useStore from '../store/useStore';

export default function ExportButtons({ onExport, loading, hasPreview, filename, onFilenameChange }) {
  const { selectedFormat, formats } = useStore();
  const currentFormat = formats.find(f => f.id === selectedFormat);

  return (
    <div className="space-y-3">
      {currentFormat && (
        <div className="text-sm text-white/40">
          Format: <span className="text-white/70">{currentFormat.name}</span> ({currentFormat.label})
        </div>
      )}
      <div>
        <label className="label-text">Dateiname</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="input-field flex-1"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            placeholder="flyer"
          />
          <span className="text-sm text-white/40">.png / .pdf</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onExport('png')}
          disabled={loading || !hasPreview}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileImage className="w-4 h-4" />
          )}
          PNG Download
        </button>
        <button
          onClick={() => onExport('pdf')}
          disabled={loading || !hasPreview}
          className="btn-secondary flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          PDF Download
        </button>
      </div>
    </div>
  );
}
