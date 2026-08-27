import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

export default function FormField({ field, value, onChange, hidden, onToggleHidden }) {
  const isHidden = hidden;

  const toggleBtn = (
    <button
      type="button"
      onClick={() => onToggleHidden(field.id)}
      className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${isHidden ? 'text-red-400/70 hover:text-red-400' : 'text-white/40 hover:text-white/70'}`}
      title={isHidden ? 'Element auf Flyer einblenden' : 'Element auf Flyer ausblenden'}
    >
      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  // Ausgeblendet: Formularfeld bleibt sichtbar aber deaktiviert
  if (isHidden) {
    return (
      <div className="opacity-40 pointer-events-none">
        <div className="flex items-center justify-between">
          <label className="label-text line-through">{field.label}</label>
          <div className="pointer-events-auto">{toggleBtn}</div>
        </div>
        {field.type === 'array' ? (
          <ArrayFieldInner field={field} value={value} onChange={onChange} disabled />
        ) : field.type === 'richtext' ? (
          <textarea
            className="input-field min-h-[120px] resize-y"
            value={value || ''}
            disabled
            placeholder={field.label}
          />
        ) : field.type === 'image' ? null : (
          <input
            type="text"
            className="input-field"
            value={value || ''}
            disabled
            placeholder={field.label}
          />
        )}
      </div>
    );
  }

  if (field.type === 'array') {
    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="label-text">{field.label}</label>
          {toggleBtn}
        </div>
        <ArrayFieldInner field={field} value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.type === 'richtext') {
    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="label-text">{field.label}</label>
          {toggleBtn}
        </div>
        <textarea
          className="input-field min-h-[120px] resize-y"
          value={value || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.label}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label-text">{field.label}</label>
        {toggleBtn}
      </div>
      <input
        type="text"
        className="input-field"
        value={value || ''}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.label}
      />
    </div>
  );
}

function ArrayFieldInner({ field, value, onChange, disabled }) {
  const items = Array.isArray(value) ? value : [];

  const updateItem = (index, newVal) => {
    if (disabled) return;
    const updated = [...items];
    updated[index] = newVal;
    onChange(field.id, updated);
  };

  const addItem = () => {
    if (disabled) return;
    onChange(field.id, [...items, '']);
  };

  const removeItem = (index) => {
    if (disabled) return;
    onChange(
      field.id,
      items.filter((_, i) => i !== index)
    );
  };

  return (
    <div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              className="input-field flex-1"
              value={item}
              disabled={disabled}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`${field.label} ${i + 1}`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="px-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 text-sm text-lime/70 hover:text-lime transition-colors"
          >
            <Plus className="w-4 h-4" />
            Zeile hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}
