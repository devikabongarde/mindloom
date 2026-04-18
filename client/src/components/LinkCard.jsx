import { useState, useEffect } from 'react';
import VibePills from './VibePills';
import LinkDetailModal from './LinkDetailModal';
import { statusConfig } from '../utils/vibeConfig';
import { getSocket } from '../utils/socket';
import api from '../utils/api';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const EMOJIS = ['🔥', '💀', '⚡', '🌀'];

function getDecayStyle(status) {
  if (status === 'aging') return 'opacity-60 grayscale-[40%]';
  if (status === 'dead')  return 'opacity-30 grayscale-[90%] scale-95';
  return 'opacity-100';
}

export default function LinkCard({ link, canDelete = false, onDelete = null }) {
  const [showDetail, setShowDetail]   = useState(false);
  const [reactions, setReactions]     = useState(link.reactions || []);
  const status = statusConfig[link.status] || statusConfig.fresh;
  const screenshotSrc = link.screenshot ? `${SERVER_URL}${link.screenshot}` : null;

  // Listen for real-time reaction updates on this link
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = ({ linkId, reactions: updated }) => {
      if (String(linkId) === String(link._id)) setReactions(updated);
    };
    s.on('reaction-update', handler);
    return () => s.off('reaction-update', handler);
  }, [link._id]);

  const handleOpen = async () => {
    await api.post(`/api/links/${link._id}/click`);
    window.open(link.url, '_blank');
  };

  const handleReact = async (emoji) => {
    try {
      const { data } = await api.post(`/api/links/${link._id}/react`, { emoji });
      setReactions(data.reactions);
    } catch { /* silent */ }
  };

  const countEmoji = (emoji) => reactions.filter((r) => r.emoji === emoji).length;

  return (
    <>
      <div
        className={`rounded-[20px] overflow-hidden flex flex-col gap-0
          bg-white/45 backdrop-blur-xl border border-white/60
          shadow-lg hover:shadow-xl hover:-translate-y-1
          transition-all duration-300 cursor-pointer group
          ${getDecayStyle(link.status)}`}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetail(true);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Screenshot thumbnail */}
        {screenshotSrc && (
          <div className="h-32 w-full overflow-hidden bg-white/20">
            <img
              src={screenshotSrc} alt={link.title}
              className="w-full h-full object-cover object-top"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

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
            <p className="text-xs text-emerald-600 italic">⚠ Click "Open" to revive this link</p>
          )}

          {/* Vibe Pills */}
          <VibePills vibes={link.vibes} />

          {/* Emoji Reactions */}
          <div className="flex gap-1.5 flex-wrap">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReact(emoji);
                }}
                className="text-sm px-2 py-0.5 rounded-full bg-white/50 hover:bg-white/80 transition flex items-center gap-1"
              >
                {emoji}
                {countEmoji(emoji) > 0 && (
                  <span className="text-xs font-semibold text-[#1A1A2E]">{countEmoji(emoji)}</span>
                )}
              </button>
            ))}
          </div>

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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A2E] transition underline underline-offset-2"
              >
                Context
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen();
                }}
                className="text-xs font-semibold text-[#F4845F] hover:underline"
              >
                Open →
              </button>
              {canDelete && typeof onDelete === 'function' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-xs font-semibold text-[#cc3d3d] hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetail && <LinkDetailModal link={link} onClose={() => setShowDetail(false)} />}
    </>
  );
}