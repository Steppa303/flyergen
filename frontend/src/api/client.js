const API_BASE = '/api';

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error('Templates laden fehlgeschlagen');
  return res.json();
}

export async function fetchTemplate(id) {
  const res = await fetch(`${API_BASE}/templates/${id}`);
  if (!res.ok) throw new Error('Template nicht gefunden');
  return res.json();
}

export async function renderFlyer(templateId, data, format = 'png', formatId = 'flyer') {
  const res = await fetch(`${API_BASE}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: templateId, data, format, formatId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Render fehlgeschlagen' }));
    throw new Error(err.error || 'Render fehlgeschlagen');
  }
  return res.blob();
}

export async function renderFlyerHtml(templateId, data) {
  const res = await fetch(`${API_BASE}/render-html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: templateId, data }),
  });
  if (!res.ok) throw new Error('HTML-Render fehlgeschlagen');
  return res.text();
}
