import { useState } from 'react';
import VibePills from './VibePills';
import LinkDetailModal from './LinkDetailModal';
import { statusConfig } from '../utils/vibeConfig';
import api from '../utils/api';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function getDecayStyle(status) {
  if (status === 'aging') return 'opacity-60 grayscale-[40%]';
  if (status === 'dead')  return 'opacity-30 grayscale-[90%] scale-95';
  return 'opacity-100';
}

export default function LinkCard({ link }) {
  const [showDetail, setShowDetail] = useState(false);
  const status = statusConfig[link.status] || statusConfig.fresh;

  const handleOpen = async () => {
    await api.post(`/api/links/${link._id}/click`);
    window.open(link.url, '_blank');
  };

  // Resolve full screenshot URL (stored as /static/... on server)
  const screenshotSrc = link.screenshot ? `${SERVER_URL}${link.screenshot}` : null;

  return (
    <>
      <div
        className={`rounded-[20px] overflow-hidden flex flex-col gap-0
          bg-white/45 backdrop-blur-xl
          border border-white/60
          shadow-lg hover:shadow-xl
          hover:-translate-y-1 transition-all duration-300
          cursor-pointer group
          ${getDecayStyle(link.status)}`}
      >
        {/* Screenshot thumbnail */}
        {screenshotSrc && (
          <div className="h-32 w-full overflow-hidden bg-white/20">
            <img
              src={screenshotSrc}
              alt={link.title}
              className="w-full h-full object-cover object-top"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Card content */}
        <div className="flex flex-col gap-3 p-5">
          {/* Title */}
          <h3 className="font-bold text-[#1A1A2E] text-base leading-snug line-clamp-2 group-hover:text-[#F4845F] transition-colors">
            {link.title}
          </h3>

          {/* Summary */}
          <p className="text-[#6B7280] text-sm leading-relaxed line-clamp-3">
            {link.summary || 'Enriching with AI…'}
          </p>

          {/* Revival hint */}
          {(link.status === 'aging' || link.status === 'dead') && (
            <p className="text-xs text-amber-500 italic">⚠ Click "Open" to revive this link</p>
          )}

          {/* Vibe Pills */}
          <VibePills vibes={link.vibes} />

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/40">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${status.border} ${status.text}`}>
                {status.label}
              </span>
              <span className="text-xs text-[#6B7280]">
                {link.minutesIdle < 1 ? 'Just added' : `Idle ${link.minutesIdle}m`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDetail(true)}
                className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A2E] transition underline underline-offset-2"
              >
                Context
              </button>
              <button
                onClick={handleOpen}
                className="text-xs font-semibold text-[#F4845F] hover:underline"
              >
                Open →
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <LinkDetailModal link={link} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
