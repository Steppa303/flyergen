import { motion } from 'framer-motion';
import { FileText, ChevronRight } from 'lucide-react';

export default function TemplateCard({ template, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card-hover p-6 flex flex-col gap-4 group"
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-xl bg-lime/10 flex items-center justify-center group-hover:bg-lime/20 transition-colors">
        <FileText className="w-7 h-7 text-lime" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
        <p className="text-sm text-white/50">
          {template.fields.length} Feld{template.fields.length !== 1 ? 'er' : ''}
        </p>
      </div>

      {/* Arrow */}
      <div className="flex items-center gap-2 text-lime text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Bearbeiten
        <ChevronRight className="w-4 h-4" />
      </div>
    </motion.div>
  );
}
