import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function ImageUpload({ currentImage, onImageSelect }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [images, setImages] = useState([]);
  const [showGallery, setShowGallery] = useState(false);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload fehlgeschlagen');
        return;
      }
      if (data.success) {
        onImageSelect(data.url);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Netzwerkfehler – Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const loadGallery = async () => {
    try {
      const res = await fetch('/api/images');
      const data = await res.json();
      setImages(data);
      setShowGallery(true);
    } catch (err) {
      console.error('Failed to load images:', err);
    }
  };

  return (
    <div className="space-y-3">
      {currentImage && (
        <div className="relative rounded-xl overflow-hidden">
          <img src={currentImage} alt="Ausgewählt" className="w-full h-48 object-cover" />
          <button
            onClick={() => onImageSelect(null)}
            className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full hover:bg-red-500"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#003660] border border-[#BFD122]/30 rounded-xl text-white hover:border-[#BFD122] transition-colors"
        >
          <Upload size={18} />
          {uploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
        </button>
        <button
          onClick={loadGallery}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#003660] border border-white/20 rounded-xl text-white hover:border-white/40 transition-colors"
        >
          <ImageIcon size={18} />
          Galerie
        </button>
      </div>
      
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {uploadError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}
      
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowGallery(false)}
          >
            <div className="bg-[#001a33] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-white text-lg mb-4">Bild auswählen</h3>
              <div className="grid grid-cols-3 gap-3">
                {images.map(img => (
                  <button
                    key={img.filename}
                    onClick={() => { onImageSelect(img.url); setShowGallery(false); }}
                    className="rounded-xl overflow-hidden border-2 border-transparent hover:border-[#BFD122] transition-colors"
                  >
                    <img src={img.thumbUrl} alt="" className="w-full h-24 object-cover" />
                  </button>
                ))}
              </div>
              {images.length === 0 && (
                <p className="text-white/50 text-center py-8">Noch keine Bilder hochgeladen</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
