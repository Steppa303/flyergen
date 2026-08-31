import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useNameBadgeStore from '../../store/useNameBadgeStore';

describe('useNameBadgeStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNameBadgeStore.getState().reset();
  });

  describe('Initial State', () => {
    test('hat korrekte Anfangswerte', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      expect(result.current.currentStep).toBe(1);
      expect(result.current.backgroundUrl).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.activeField).toBeNull();
      expect(result.current.zoom).toBe(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('hat Standard-Textfeld-Konfiguration', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      expect(result.current.fields.vorname).toBeDefined();
      expect(result.current.fields.nachname).toBeDefined();
      expect(result.current.fields.behoerde).toBeDefined();
      expect(result.current.fields.vorname.fontSize).toBe(14);
      expect(result.current.fields.vorname.fontFamily).toBe('Arial');
    });
  });

  describe('Step-Management', () => {
    test('nextStep erhöht den Schritt', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.nextStep());
      expect(result.current.currentStep).toBe(2);
    });

    test('nextStep geht nicht über 4 hinaus', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep(); // Should stay at 4
      });
      expect(result.current.currentStep).toBe(4);
    });

    test('prevStep verringert den Schritt', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.nextStep();
        result.current.nextStep();
      });
      act(() => result.current.prevStep());
      expect(result.current.currentStep).toBe(2);
    });

    test('prevStep geht nicht unter 1', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.prevStep());
      expect(result.current.currentStep).toBe(1);
    });

    test('goToStep setzt den Schritt direkt', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.goToStep(3));
      expect(result.current.currentStep).toBe(3);
    });
  });

  describe('Background-Actions', () => {
    test('setBackground setzt URL', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setBackground('/uploads/namebadge/bg_123.png'));
      expect(result.current.backgroundUrl).toBe('/uploads/namebadge/bg_123.png');
      expect(result.current.selectedBackground).toBe('/uploads/namebadge/bg_123.png');
    });

    test('setBackgroundMeta setzt Dimensionen', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setBackgroundMeta({ width: 1240, height: 1748 }));
      expect(result.current.backgroundWidth).toBe(1240);
      expect(result.current.backgroundHeight).toBe(1748);
    });

    test('setHasBleed und setBleedSize', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.setHasBleed(true);
        result.current.setBleedSize(3);
      });
      expect(result.current.hasBleed).toBe(true);
      expect(result.current.bleedSize).toBe(3);
    });

    test('setDoubleSided toggelt beidseitig', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setDoubleSided(true));
      expect(result.current.doubleSided).toBe(true);
    });

    test('setDoubleSided(false) löscht backSideUrl', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.setDoubleSided(true);
        result.current.setBackSideUrl('/uploads/namebadge/back.png');
      });
      act(() => result.current.setDoubleSided(false));
      expect(result.current.backSideUrl).toBeNull();
    });

    test('setBackSideUrl setzt URL', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setBackSideUrl('/uploads/namebadge/back_123.png'));
      expect(result.current.backSideUrl).toBe('/uploads/namebadge/back_123.png');
    });
  });

  describe('CSV-Actions', () => {
    test('setParticipants setzt Daten und Dateinamen', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      const participants = [
        { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
      ];
      act(() => result.current.setParticipants(participants, 'test.csv'));
      expect(result.current.participants).toEqual(participants);
      expect(result.current.csvFileName).toBe('test.csv');
      expect(result.current.csvError).toBeNull();
    });

    test('setCsvError setzt Fehler und löscht Daten', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.setParticipants([{ vorname: 'Max', nachname: 'M', behoerde: 'T' }], 'test.csv');
        result.current.setCsvError('Fehler');
      });
      expect(result.current.csvError).toBe('Fehler');
      expect(result.current.participants).toEqual([]);
      expect(result.current.csvFileName).toBeNull();
    });
  });

  describe('Field-Actions', () => {
    test('updateField aktualisiert ein Feld', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.updateField('vorname', { fontSize: 24 }));
      expect(result.current.fields.vorname.fontSize).toBe(24);
      // Other properties should remain
      expect(result.current.fields.vorname.fontFamily).toBe('Arial');
    });

    test('updateField aktualisiert mehrere Eigenschaften', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.updateField('vorname', { fontSize: 24, fontWeight: 'normal', color: '#ff0000' }));
      expect(result.current.fields.vorname.fontSize).toBe(24);
      expect(result.current.fields.vorname.fontWeight).toBe('normal');
      expect(result.current.fields.vorname.color).toBe('#ff0000');
    });

    test('setActiveField setzt aktives Feld', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setActiveField('vorname'));
      expect(result.current.activeField).toBe('vorname');
    });

    test('setActiveField(null) deaktiviert Feld', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.setActiveField('vorname');
        result.current.setActiveField(null);
      });
      expect(result.current.activeField).toBeNull();
    });
  });

  describe('UI-Actions', () => {
    test('setZoom begrenzt auf 0.25-3', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setZoom(5));
      expect(result.current.zoom).toBe(3);
      act(() => result.current.setZoom(0.1));
      expect(result.current.zoom).toBe(0.25);
    });

    test('setZoom akzeptiert gültige Werte', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setZoom(1.5));
      expect(result.current.zoom).toBe(1.5);
    });

    test('setLoading und setError', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.setLoading(true);
        result.current.setError('Testfehler');
      });
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe('Testfehler');
    });

    test('setPreviewUrl und setDownloadUrl', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.setPreviewUrl('blob:preview');
        result.current.setDownloadUrl('blob:download');
      });
      expect(result.current.previewUrl).toBe('blob:preview');
      expect(result.current.downloadUrl).toBe('blob:download');
    });

    test('setPreviewParticipantIndex', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => result.current.setPreviewParticipantIndex(5));
      expect(result.current.previewParticipantIndex).toBe(5);
    });
  });

  describe('Reset', () => {
    test('reset setzt alles zurück', () => {
      const { result } = renderHook(() => useNameBadgeStore());
      act(() => {
        result.current.nextStep();
        result.current.setBackground('/test.png');
        result.current.setParticipants([{ vorname: 'Max', nachname: 'M', behoerde: 'T' }], 'test.csv');
        result.current.updateField('vorname', { fontSize: 24 });
        result.current.setActiveField('vorname');
        result.current.setZoom(2);
        result.current.setError('Fehler');
      });

      act(() => result.current.reset());

      expect(result.current.currentStep).toBe(1);
      expect(result.current.backgroundUrl).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.fields.vorname.fontSize).toBe(14);
      expect(result.current.activeField).toBeNull();
      expect(result.current.zoom).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });
});
