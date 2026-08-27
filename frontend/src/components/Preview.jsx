import { Loader2, ImageOff } from 'lucide-react';

export default function Preview({ previewUrl, loading, error }) {
  return (
    <div className="glass-card p-4 flex flex-col items-center justify-center min-h-[400px] lg:min-h-[600px]">
      {loading && (
        <div className="flex flex-col items-center gap-3 text-white/50">
          <Loader2 className="w-8 h-8 animate-spin text-lime" />
          <span className="text-sm">Flyer wird gerendert …</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 text-red-400">
          <ImageOff className="w-10 h-10" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && !error && !previewUrl && (
        <div className="flex flex-col items-center gap-3 text-white/30">
          <ImageOff className="w-10 h-10" />
          <span className="text-sm">Vorschau erscheint hier</span>
        </div>
      )}

      {!loading && !error && previewUrl && (
        <img
          src={previewUrl}
          alt="Flyer Vorschau"
          className="max-w-full max-h-[600px] rounded-xl shadow-2xl object-contain"
        />
      )}
    </div>
  );
}
