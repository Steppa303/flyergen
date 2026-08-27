import { create } from 'zustand';

const useStore = create((set, get) => ({
  // State
  templates: [],
  selectedTemplate: null,
  formData: {},
  hiddenFields: {},
  exportFilename: 'flyer',
  previewUrl: null,
  previewHtml: null,
  loading: false,
  renderLoading: false,
  error: null,
  selectedFormat: 'flyer',
  formats: [],

  // Actions
  setTemplates: (templates) => set({ templates }),

  selectTemplate: (template) =>
    set({
      selectedTemplate: template,
      formData: template.fields.reduce(
        (acc, f) => ({ ...acc, [f.id]: f.default }),
        {}
      ),
      formats: template.formats || [],
      selectedFormat: 'flyer',
      previewUrl: null,
      previewHtml: null,
      error: null,
    }),

  updateField: (id, value) =>
    set((state) => ({
      formData: { ...state.formData, [id]: value },
    })),

  toggleFieldHidden: (id) =>
    set((state) => {
      const next = { ...state.hiddenFields };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return { hiddenFields: next };
    }),

  setSelectedFormat: (formatId) => set({ selectedFormat: formatId }),

  setExportFilename: (name) => set({ exportFilename: name }),

  setPreviewUrl: (url) => set({ previewUrl: url }),
  setPreviewHtml: (html) => set({ previewHtml: html }),
  setLoading: (loading) => set({ loading }),
  setRenderLoading: (renderLoading) => set({ renderLoading }),
  setError: (error) => set({ error }),

  resetEditor: () =>
    set({
      selectedTemplate: null,
      formData: {},
      hiddenFields: {},
      exportFilename: 'flyer',
      previewUrl: null,
      previewHtml: null,
      error: null,
      selectedFormat: 'flyer',
      formats: [],
    }),
}));

export default useStore;
