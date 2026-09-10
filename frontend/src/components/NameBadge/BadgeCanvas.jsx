import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import useNameBadgeStore from '../../store/useNameBadgeStore';

// Badge physical size in mm (A6)
const BADGE_WIDTH_MM = 105;
const BADGE_HEIGHT_MM = 148;

// Base canvas width in pixels
const BASE_CANVAS_WIDTH = 630;

const FIELD_LABELS = {
  vorname: 'Vorname',
  nachname: 'Nachname',
  behoerde: 'Behörde',
  workshop: 'Workshop',
};



export default function BadgeCanvas() {
  const {
    backgroundUrl, fields, activeField, setActiveField, updateField,
    zoom, setZoom, participants, previewParticipantIndex,
  } = useNameBadgeStore();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0 });

  // Canvas dimensions
  const canvasWidth = BASE_CANVAS_WIDTH * zoom;
  const canvasHeight = canvasWidth * (BADGE_HEIGHT_MM / BADGE_WIDTH_MM);
  const pxPerMm = canvasWidth / BADGE_WIDTH_MM;

  // Get longest text per column from participants (worst-case for layout)
  const longestTexts = useMemo(() => {
    const result = { vorname: '', nachname: '', behoerde: '', workshop: '' };
    for (const p of participants) {
      for (const key of Object.keys(result)) {
        if ((p[key] || '').length > result[key].length) {
          result[key] = p[key];
        }
      }
    }
    return result;
  }, [participants]);

  const getPreviewText = (fieldId) => {
    // Show longest text from CSV (worst-case layout)
    if (longestTexts[fieldId]) return longestTexts[fieldId];
    // Fallback to selected participant
    const p = participants[previewParticipantIndex];
    if (p && p[fieldId]) return p[fieldId];
    return '';
  };

  // Convert mm to px
  const mmToPx = (mm) => mm * pxPerMm;

  // Convert px to mm
  const pxToMm = (px) => px / pxPerMm;

  // Handle field drag start
  const handleFieldMouseDown = useCallback((e, fieldId) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveField(fieldId);

    const field = fields[fieldId];
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
    };
    setDragging(fieldId);
  }, [fields, setActiveField]);

  // Handle resize start
  const handleResizeMouseDown = useCallback((e, fieldId) => {
    e.stopPropagation();
    e.preventDefault();
    dragStart.current = {
      x: e.clientX,
      fieldWidth: fields[fieldId].width,
    };
    setResizing(fieldId);
  }, [fields]);

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging) {
        const dx = pxToMm(e.clientX - dragStart.current.x);
        const dy = pxToMm(e.clientY - dragStart.current.y);
        const newX = Math.max(0, Math.min(BADGE_WIDTH_MM - 10, dragStart.current.fieldX + dx));
        const newY = Math.max(0, Math.min(BADGE_HEIGHT_MM - 10, dragStart.current.fieldY + dy));
        updateField(dragging, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
      }
      if (resizing) {
        const dx = pxToMm(e.clientX - dragStart.current.x);
        const newWidth = Math.max(10, Math.min(BADGE_WIDTH_MM - fields[resizing].x, dragStart.current.fieldWidth + dx));
        updateField(resizing, { width: Math.round(newWidth * 10) / 10 });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      setResizing(null);
    };

    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, updateField]);

  // Zoom controls
  const handleZoomIn = () => setZoom(zoom + 0.25);
  const handleZoomOut = () => setZoom(zoom - 0.25);
  const handleZoomReset = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    }
  }, [zoom, setZoom]);

  if (!backgroundUrl) {
    return (
      <div className="glass-card p-8 text-center text-white/40">
        <p>Bitte zuerst einen Hintergrund auswählen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          title="Verkleinern"
        >
          <ZoomOut className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-sm text-white/50 w-16 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          title="Vergrößern"
        >
          <ZoomIn className="w-4 h-4 text-white/70" />
        </button>
        <button
          onClick={handleZoomReset}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          title="Zurücksetzen"
        >
          <Maximize2 className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="overflow-auto border border-white/10 rounded-2xl bg-white/5 p-4"
        onWheel={handleWheel}
      >
        <div
          ref={canvasRef}
          className="relative mx-auto shadow-2xl"
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
          onClick={() => setActiveField(null)}
        >
          {/* Background Image */}
          <img
            src={backgroundUrl}
            alt="Hintergrund"
            className="absolute inset-0 w-full h-full object-cover rounded-lg select-none pointer-events-none"
            draggable={false}
          />

          {/* Text Fields */}
          {Object.entries(fields).map(([fieldId, config]) => {
            const isActive = activeField === fieldId;
            const isDragging = dragging === fieldId;
            const isResizing = resizing === fieldId;

            return (
              <div
                key={fieldId}
                className={`absolute cursor-move select-none transition-shadow ${
                  isActive
                    ? 'ring-2 ring-lime shadow-lg shadow-lime/20'
                    : 'ring-1 ring-white/20 hover:ring-white/40'
                } ${isDragging || isResizing ? 'opacity-80' : ''}`}
                style={{
                  left: `${mmToPx(config.x)}px`,
                  top: `${mmToPx(config.y)}px`,
                  width: `${mmToPx(config.width)}px`,
                  minHeight: `${mmToPx(8)}px`,
                  fontSize: `${config.fontSize * zoom * 1.33}px`,
                  fontFamily: `'${config.fontFamily}', sans-serif`,
                  fontWeight: config.fontWeight,
                  fontStyle: config.fontStyle,
                  color: config.color,
                  textAlign: config.align,
                  lineHeight: config.lineHeight,
                  letterSpacing: `${config.letterSpacing * zoom}px`,
                  padding: '4px',
                  backgroundColor: isActive ? 'rgba(191, 209, 34, 0.05)' : 'rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                }}
                onMouseDown={(e) => handleFieldMouseDown(e, fieldId)}
                onClick={(e) => { e.stopPropagation(); setActiveField(fieldId); }}
              >
                <div className="text-xs text-white/40 mb-1 select-none pointer-events-none">
                  {FIELD_LABELS[fieldId]}
                </div>
                <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                  {getPreviewText(fieldId)}
                </div>

                {/* Resize Handle */}
                {isActive && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-lime/30"
                    onMouseDown={(e) => handleResizeMouseDown(e, fieldId)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Field Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(FIELD_LABELS).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveField(activeField === id ? null : id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeField === id
                ? 'bg-lime text-navy-900'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
