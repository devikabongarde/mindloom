import { useState, useEffect } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(link.suggestions || []);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const status = statusConfig[link.status] || statusConfig.fresh;
  const screenshotSrc = link.screenshot ? `${SERVER_URL}${link.screenshot}` : null;

  useEffect(() => {
    setSuggestions(link.suggestions || []);
  }, [link.suggestions]);

  // Listen for real-time reaction updates on this link
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = ({ linkId, reactions: updated }) => {
      if (String(linkId) === String(link._id)) setReactions(updated);
    };
    const suggestionHandler = ({ linkId, suggestion }) => {
      if (String(linkId) !== String(link._id)) return;
      setSuggestions((prev) => {
        if (prev.some((item) => String(item._id) === String(suggestion?._id))) return prev;
        return [...prev, suggestion];
      });
    };
    s.on('reaction-update', handler);
    s.on('suggestion-update', suggestionHandler);
    return () => {
      s.off('reaction-update', handler);
      s.off('suggestion-update', suggestionHandler);
    };
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

  const normalizeSuggestion = (item) => ({
    _id: item?._id,
    text: item?.text || '',
    createdAt: item?.createdAt || new Date().toISOString(),
    user: item?.user || {
      _id: item?.userId?._id || item?.userId || null,
      name: item?.userId?.name || 'Unknown',
    },
  });

  const loadSuggestions = async () => {
    try {
      const { data } = await api.get(`/api/links/${link._id}/suggestions`);
      setSuggestions(Array.isArray(data) ? data.map(normalizeSuggestion) : []);
    } catch {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (showSuggestions) loadSuggestions();
  }, [showSuggestions]);

  const handleAddSuggestion = async () => {
    const text = suggestionText.trim();
    if (!text || suggestionLoading) return;

    try {
      setSuggestionLoading(true);
      const { data } = await api.post(`/api/links/${link._id}/suggestions`, { text });
      setSuggestions((prev) => {
        if (prev.some((item) => String(item._id) === String(data?._id))) return prev;
        return [...prev, normalizeSuggestion(data)];
      });
      setSuggestionText('');
    } catch {
      // silent
    } finally {
      setSuggestionLoading(false);
    }
  };

  const countEmoji = (emoji) => reactions.filter((r) => r.emoji === emoji).length;

  return (
    <>
      <div
        className={`relative rounded-[20px] overflow-visible flex flex-col gap-0
          bg-white/45 backdrop-blur-xl border border-white/60
          shadow-lg hover:shadow-xl hover:-translate-y-1
          transition-all duration-300 cursor-pointer group
          ${showSuggestions ? 'z-[120]' : 'z-0'}
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
              <div
                className="relative z-[130]"
                onMouseEnter={() => setShowSuggestions(true)}
                onMouseLeave={() => setShowSuggestions(false)}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="relative text-[#6B7280] hover:text-[#1A1A2E] transition"
                  title="Suggestions"
                  aria-label="Open suggestions"
                >
                  <MessageSquare size={16} />
                  {suggestions.length > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-[16px] h-4 px-1 rounded-full bg-[#F4845F] text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {suggestions.length > 99 ? '99+' : suggestions.length}
                    </span>
                  )}
                </button>

                {showSuggestions && (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-[140] w-[270px] rounded-xl bg-white/95 border border-white/80 p-3 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <p className="text-[11px] font-semibold text-[#20314d] uppercase tracking-[0.14em]">Link Suggestions</p>
                    <p className="text-xs theme-muted mt-1">Collaborative notes for this link only.</p>

                    <div className="mt-2 max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {suggestions.length === 0 ? (
                        <p className="text-xs theme-muted">No suggestions yet.</p>
                      ) : (
                        suggestions.map((item) => (
                          <div key={item._id} className="rounded-lg bg-white/70 border border-white/80 px-2 py-1.5">
                            <p className="text-[11px] font-semibold text-[#2b4265]">{item.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-[#1A1A2E] leading-relaxed">{item.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Add a suggestion..."
                        maxLength={300}
                        className="flex-1 rounded-lg bg-white/85 border border-white/80 px-2.5 py-1.5 text-xs text-[#20314d] outline-none"
                      />
                      <button
                        onClick={handleAddSuggestion}
                        onKeyDown={(e) => e.stopPropagation()}
                        disabled={suggestionLoading || !suggestionText.trim()}
                        className="text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-[#F4845F] text-white disabled:opacity-60"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                  title="Delete link"
                  aria-label="Delete link"
                  className="text-[#cc3d3d] hover:text-[#a92828] transition"
                >
                  <Trash2 size={15} />
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