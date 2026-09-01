import { useMemo } from 'react';
import { Eye } from 'lucide-react';
import useNameBadgeStore from '../../store/useNameBadgeStore';

/**
 * Real-size badge preview using the same CSS as the PDF renderer.
 * Renders at actual print size (mm) so what you see = what you get.
 */
export default function BadgePreview() {
  const {
    backgroundUrl, fields, participants, previewParticipantIndex,
  } = useNameBadgeStore();

  // Use longest text per column for preview (worst-case layout)
  const longestTexts = useMemo(() => {
    const result = { vorname: '', nachname: '', behoerde: '' };
    for (const p of participants) {
      for (const key of Object.keys(result)) {
        if ((p[key] || '').length > result[key].length) {
          result[key] = p[key];
        }
      }
    }
    return result;
  }, [participants]);

  const participant = participants[previewParticipantIndex] || null;

  const getFieldText = (fieldId) => {
    if (longestTexts[fieldId]) return longestTexts[fieldId];
    if (participant && participant[fieldId]) return participant[fieldId];
    return '';
  };

  if (!backgroundUrl) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-white/50" />
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
          Druckvorschau (1:1)
        </h3>
      </div>

      <div className="overflow-auto rounded-xl bg-white/5 p-3">
        {/* Badge at actual print size: 105mm × 148mm */}
        <div
          className="relative mx-auto shadow-lg"
          style={{
            width: '105mm',
            height: '148mm',
            overflow: 'hidden',
          }}
        >
          {/* Background */}
          <img
            src={backgroundUrl}
            alt="Hintergrund"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ pointerEvents: 'none' }}
          />

          {/* Text fields — same CSS as PDF renderer */}
          {Object.entries(fields).map(([fieldId, config]) => {
            const text = getFieldText(fieldId);
            if (!text) return null;

            return (
              <div
                key={fieldId}
                className="absolute"
                style={{
                  left: `${config.x}mm`,
                  top: `${config.y}mm`,
                  width: `${config.width}mm`,
                  fontSize: `${config.fontSize}pt`,
                  fontFamily: `'${config.fontFamily}', sans-serif`,
                  fontWeight: config.fontWeight,
                  fontStyle: config.fontStyle,
                  color: config.color,
                  textAlign: config.align,
                  lineHeight: config.lineHeight,
                  letterSpacing: `${config.letterSpacing}pt`,
                  overflow: 'hidden',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-white/30 mt-2 text-center">
        105 × 148mm — zeigt längsten Text je Spalte
      </p>
    </div>
  );
}
