import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Palette, Pipette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import useNameBadgeStore from '../../store/useNameBadgeStore';

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Impact',
  'Comic Sans MS',
];

const FIELD_LABELS = {
  vorname: 'Vorname',
  nachname: 'Nachname',
  behoerde: 'Behörde',
};

export default function TextFieldConfig() {
  const { fields, activeField, updateField } = useNameBadgeStore();
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!activeField) {
    return (
      <div className="glass-card p-6 text-center text-white/40">
        <Type className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Klicke auf ein Textfeld im Canvas, um es zu konfigurieren.</p>
      </div>
    );
  }

  const field = fields[activeField];

  const handleChange = (key, value) => {
    updateField(activeField, { [key]: value });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeField}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
          {FIELD_LABELS[activeField]} konfigurieren
        </h3>

        {/* Position */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">X-Position (mm)</label>
            <input
              type="number"
              min="0"
              max="105"
              step="0.5"
              value={field.x}
              onChange={(e) => handleChange('x', parseFloat(e.target.value) || 0)}
              className="input-field text-sm py-2"
            />
          </div>
          <div>
            <label className="label-text">Y-Position (mm)</label>
            <input
              type="number"
              min="0"
              max="148"
              step="0.5"
              value={field.y}
              onChange={(e) => handleChange('y', parseFloat(e.target.value) || 0)}
              className="input-field text-sm py-2"
            />
          </div>
        </div>

        {/* Width */}
        <div>
          <label className="label-text">Breite (mm)</label>
          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={field.width}
            onChange={(e) => handleChange('width', parseFloat(e.target.value))}
            className="w-full accent-lime"
          />
          <span className="text-xs text-white/40">{field.width}mm</span>
        </div>

        {/* Font Size */}
        <div>
          <label className="label-text">Schriftgröße (pt)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="6"
              max="72"
              step="1"
              value={field.fontSize}
              onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
              className="flex-1 accent-lime"
            />
            <input
              type="number"
              min="6"
              max="72"
              value={field.fontSize}
              onChange={(e) => handleChange('fontSize', parseFloat(e.target.value) || 14)}
              className="input-field w-16 text-sm py-1 text-center"
            />
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="label-text">Schriftart</label>
          <select
            value={field.fontFamily}
            onChange={(e) => handleChange('fontFamily', e.target.value)}
            className="input-field text-sm py-2"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Font Weight & Style */}
        <div className="flex gap-2">
          <button
            onClick={() => handleChange('fontWeight', field.fontWeight === 'bold' ? 'normal' : 'bold')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              field.fontWeight === 'bold'
                ? 'bg-lime text-navy-900'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Bold className="w-4 h-4" />
            Fett
          </button>
          <button
            onClick={() => handleChange('fontStyle', field.fontStyle === 'italic' ? 'normal' : 'italic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              field.fontStyle === 'italic'
                ? 'bg-lime text-navy-900'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Italic className="w-4 h-4" />
            Kursiv
          </button>
        </div>

        {/* Color */}
        <div>
          <label className="label-text">Farbe</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div
                className="w-6 h-6 rounded border border-white/20"
                style={{ backgroundColor: field.color }}
              />
              <span className="text-sm text-white/70">{field.color}</span>
            </button>
            {window.EyeDropper && (
              <button
                onClick={async () => {
                  try {
                    const eyeDropper = new window.EyeDropper();
                    const result = await eyeDropper.open();
                    handleChange('color', result.sRGBHex);
                  } catch (e) {
                    // User cancelled — ignore
                  }
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="Farbe vom Bildschirm picken"
              >
                <Pipette className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 p-3 bg-navy-800 rounded-xl border border-white/10"
            >
              <HexColorPicker
                color={field.color}
                onChange={(c) => handleChange('color', c)}
                style={{ width: '100%', height: '150px' }}
              />
              <input
                type="text"
                value={field.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="input-field text-sm py-1 mt-2 text-center font-mono"
              />
            </motion.div>
          )}
        </div>

        {/* Alignment */}
        <div>
          <label className="label-text">Ausrichtung</label>
          <div className="flex gap-1">
            {[
              { value: 'left', icon: AlignLeft },
              { value: 'center', icon: AlignCenter },
              { value: 'right', icon: AlignRight },
            ].map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleChange('align', value)}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-colors ${
                  field.align === value
                    ? 'bg-lime text-navy-900'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div>
          <label className="label-text">Zeilenhöhe</label>
          <input
            type="range"
            min="0.8"
            max="2.0"
            step="0.1"
            value={field.lineHeight}
            onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
            className="w-full accent-lime"
          />
          <span className="text-xs text-white/40">{field.lineHeight}</span>
        </div>

        {/* Letter Spacing */}
        <div>
          <label className="label-text">Buchstabenabstand (pt)</label>
          <input
            type="range"
            min="-2"
            max="10"
            step="0.5"
            value={field.letterSpacing}
            onChange={(e) => handleChange('letterSpacing', parseFloat(e.target.value))}
            className="w-full accent-lime"
          />
          <span className="text-xs text-white/40">{field.letterSpacing}pt</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
