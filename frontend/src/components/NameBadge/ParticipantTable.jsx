import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Users } from 'lucide-react';
import useNameBadgeStore from '../../store/useNameBadgeStore';

const PAGE_SIZE = 50;

export default function ParticipantTable() {
  const { participants, previewParticipantIndex, setPreviewParticipantIndex } = useNameBadgeStore();
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let data = [...participants];

    // Filter
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.vorname.toLowerCase().includes(q) ||
          p.nachname.toLowerCase().includes(q) ||
          p.behoerde.toLowerCase().includes(q) ||
          (p.workshop && p.workshop.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      data.sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase();
        const vb = (b[sortCol] || '').toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [participants, search, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  if (participants.length === 0) return null;

  const hasWorkshop = participants.some(p => p.workshop);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Teilnehmer ({participants.length})
        </h3>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="input-field pl-10 text-sm py-2"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-navy-900">
            <tr className="border-b border-white/10">
              <th
                className="text-left py-2 px-2 text-white/50 font-medium cursor-pointer hover:text-white/70"
                onClick={() => handleSort('vorname')}
              >
                Vorname <SortIcon col="vorname" />
              </th>
              <th
                className="text-left py-2 px-2 text-white/50 font-medium cursor-pointer hover:text-white/70"
                onClick={() => handleSort('nachname')}
              >
                Nachname <SortIcon col="nachname" />
              </th>
              <th
                className="text-left py-2 px-2 text-white/50 font-medium cursor-pointer hover:text-white/70"
                onClick={() => handleSort('behoerde')}
              >
                Behörde <SortIcon col="behoerde" />
              </th>
              {hasWorkshop && (
                <th
                  className="text-left py-2 px-2 text-white/50 font-medium cursor-pointer hover:text-white/70"
                  onClick={() => handleSort('workshop')}
                >
                  Workshop <SortIcon col="workshop" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => {
              const globalIdx = page * PAGE_SIZE + i;
              return (
                <tr
                  key={globalIdx}
                  className={`border-b border-white/5 cursor-pointer transition-colors ${
                    previewParticipantIndex === globalIdx
                      ? 'bg-lime/10 border-lime/20'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => setPreviewParticipantIndex(globalIdx)}
                >
                  <td className="py-1.5 px-2 text-white/80 truncate max-w-[100px]">{row.vorname}</td>
                  <td className="py-1.5 px-2 text-white/80 truncate max-w-[100px]">{row.nachname}</td>
                  <td className="py-1.5 px-2 text-white/60 truncate max-w-[150px]">{row.behoerde}</td>
                  {hasWorkshop && (
                    <td className="py-1.5 px-2 text-white/60 truncate max-w-[150px]">{row.workshop || ''}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-white/40">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
          >
            Zurück
          </button>
          <span>Seite {page + 1} von {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
