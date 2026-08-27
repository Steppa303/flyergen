import TemplateCard from './TemplateCard';

export default function TemplateGrid({ templates, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((t, i) => (
        <TemplateCard
          key={t.id}
          template={t}
          onClick={() => onSelect(t)}
        />
      ))}
    </div>
  );
}
