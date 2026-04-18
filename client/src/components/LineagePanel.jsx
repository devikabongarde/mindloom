import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';

export default function LineagePanel({ shelfId }) {
  const [lineage, setLineage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!shelfId) return;
    api.get(`/api/shelves/${shelfId}/lineage`)
      .then(({ data }) => setLineage(data))
      .catch(() => {}); // silent fail — non-critical UI
  }, [shelfId]);

  if (!lineage || (!lineage.current.forkedFrom && lineage.totalRemixes === 0)) return null;

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-[20px] p-4 border border-white/60">
      <p className="text-xs uppercase tracking-widest font-semibold text-[#6B7280] mb-3">
        🌿 Lineage
      </p>

      {lineage.current.forkedFrom && (
        <p className="text-xs text-[#6B7280] mb-2">
          Forked from:{' '}
          <button
            onClick={() => navigate(`/shelf/${lineage.current.forkedFrom._id}`)}
            className="font-semibold text-[#1A1A2E] hover:text-[#F4845F] transition underline underline-offset-2"
          >
            {lineage.current.forkedFrom.name}
          </button>
        </p>
      )}

      <p className="text-xs text-[#6B7280]">
        Remixed{' '}
        <span className="font-semibold text-[#1A1A2E]">{lineage.totalRemixes}</span>{' '}
        time{lineage.totalRemixes !== 1 ? 's' : ''}
      </p>

      {lineage.forks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {lineage.forks.map((f) => (
            <button
              key={f._id}
              onClick={() => navigate(`/shelf/${f._id}`)}
              className="text-xs bg-white/70 rounded-full px-3 py-1 hover:bg-white transition text-[#1A1A2E]"
            >
              {f.name} <span className="text-[#6B7280]">by {f.owner}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}