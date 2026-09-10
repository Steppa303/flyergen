import { create } from 'zustand';

const DEFAULT_FIELDS = {
  vorname: {
    x: 20, y: 15, width: 60,
    fontSize: 14, fontFamily: 'Arial',
    fontWeight: 'bold', fontStyle: 'normal',
    color: '#000000', align: 'left',
    lineHeight: 1.2, letterSpacing: 0,
  },
  nachname: {
    x: 20, y: 22, width: 60,
    fontSize: 14, fontFamily: 'Arial',
    fontWeight: 'bold', fontStyle: 'normal',
    color: '#000000', align: 'left',
    lineHeight: 1.2, letterSpacing: 0,
  },
  behoerde: {
    x: 20, y: 32, width: 60,
    fontSize: 10, fontFamily: 'Arial',
    fontWeight: 'normal', fontStyle: 'normal',
    color: '#333333', align: 'left',
    lineHeight: 1.2, letterSpacing: 0,
  },
  workshop: {
    x: 20, y: 40, width: 60,
    fontSize: 9, fontFamily: 'Arial',
    fontWeight: 'normal', fontStyle: 'italic',
    color: '#555555', align: 'left',
    lineHeight: 1.2, letterSpacing: 0,
  },
};

const useNameBadgeStore = create((set, get) => ({
  // Step management
  currentStep: 1,

  // Background
  backgroundSource: 'upload',
  selectedBackground: null,
  backgroundUrl: null,
  backgroundWidth: 105,
  backgroundHeight: 148,
  hasBleed: false,
  bleedSize: 0,
  doubleSided: false,
  backSideUrl: null,

  // CSV
  participants: [],
  csvFileName: null,
  csvError: null,

  // Text field configuration
  fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
  activeField: null,

  // UI
  zoom: 1,
  loading: false,
  error: null,
  previewUrl: null,
  downloadUrl: null,
  previewParticipantIndex: 0,

  // Actions — Step
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 4) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  goToStep: (step) => set({ currentStep: step }),

  // Actions — Background
  setBackground: (url) => set({ backgroundUrl: url, selectedBackground: url }),
  setBackgroundMeta: (meta) => set({
    backgroundWidth: meta.width || 105,
    backgroundHeight: meta.height || 148,
  }),
  setHasBleed: (val) => set({ hasBleed: val }),
  setBleedSize: (val) => set({ bleedSize: val }),
  setDoubleSided: (val) => set({ doubleSided: val, backSideUrl: val ? get().backSideUrl : null }),
  setBackSideUrl: (url) => set({ backSideUrl: url }),

  // Actions — CSV
  setParticipants: (data, fileName) => set({ participants: data, csvFileName: fileName, csvError: null }),
  setCsvError: (err) => set({ csvError: err, participants: [], csvFileName: null }),

  // Actions — Fields
  updateField: (fieldId, config) =>
    set((s) => ({
      fields: {
        ...s.fields,
        [fieldId]: { ...s.fields[fieldId], ...config },
      },
    })),
  setActiveField: (fieldId) => set({ activeField: fieldId }),

  // Actions — UI
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setDownloadUrl: (url) => set({ downloadUrl: url }),
  setPreviewParticipantIndex: (idx) => set({ previewParticipantIndex: idx }),

  // Actions — Reset
  reset: () => set({
    currentStep: 1,
    backgroundSource: 'upload',
    selectedBackground: null,
    backgroundUrl: null,
    backgroundWidth: 105,
    backgroundHeight: 148,
    hasBleed: false,
    bleedSize: 0,
    doubleSided: false,
    backSideUrl: null,
    participants: [],
    csvFileName: null,
    csvError: null,
    fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
    activeField: null,
    zoom: 1,
    loading: false,
    error: null,
    previewUrl: null,
    downloadUrl: null,
    previewParticipantIndex: 0,
  }),
}));

export default useNameBadgeStore;
