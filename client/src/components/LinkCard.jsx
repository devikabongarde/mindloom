import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Trash2, Link2, Flame, Skull, Zap, Orbit } from 'lucide-react';
import VibePills from './VibePills';
import LinkDetailModal from './LinkDetailModal';
import { statusConfig } from '../utils/vibeConfig';
import { getSocket } from '../utils/socket';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const REACTIONS = [
  { emoji: '🔥', label: 'Hot', Icon: Flame },
  { emoji: '💀', label: 'Dead', Icon: Skull },
  { emoji: '⚡', label: 'Fast', Icon: Zap },
  { emoji: '🌀', label: 'Chaotic', Icon: Orbit },
];
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;
const DECAY_FRESH_MINUTES = 10;
const DECAY_DEAD_MINUTES = 30;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function getDecayMetrics(minutesIdle) {
  const idle = Number.isFinite(minutesIdle) ? Math.max(0, minutesIdle) : 0;
  const progress = clamp01(idle / DECAY_DEAD_MINUTES);
  const lifePercent = clamp01(1 - progress);

  let phase = 'fresh';
  if (idle >= DECAY_DEAD_MINUTES) phase = 'dead';
  else if (idle >= DECAY_FRESH_MINUTES) phase = 'aging';

  const minutesToCompost = Math.max(0, DECAY_DEAD_MINUTES - idle);
  const lifeLabel =
    phase === 'dead'
      ? 'In compost zone'
      : `${Math.max(1, Math.ceil(minutesToCompost))}m to compost`;

  return { idle, progress, lifePercent, phase, lifeLabel };
}

function toAbsoluteUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}

function renderTextWithLinks(text = '') {
  const raw = String(text || '');
  const parts = raw.split(URL_REGEX);

  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const href = toAbsoluteUrl(part);
      return (
        <a
          key={`${part}-${index}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-[#F4845F] hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    URL_REGEX.lastIndex = 0;
    return <span key={`text-${index}`}>{part}</span>;
  });
}

export default function LinkCard({ link, canDelete = false, onDelete = null }) {
  const { user } = useAuth();
  const [showDetail, setShowDetail]   = useState(false);
  const [reactions, setReactions]     = useState(link.reactions || []);
  const [activePopover, setActivePopover] = useState(null); // 'comment' | 'link' | null
  const [suggestions, setSuggestions] = useState(link.suggestions || []);
  const [suggestionText, setSuggestionText] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [deletingSuggestionId, setDeletingSuggestionId] = useState(null);
  const [tick, setTick] = useState(() => Date.now());
  const closeTimerRef = useRef(null);
  const holdOpenUntilRef = useRef(0);
  const eventTime = new Date(link.lastClickedAt || link.createdAt || Date.now()).getTime();
  const calculatedIdle = Number.isFinite(eventTime)
    ? Math.floor((tick - eventTime) / 60000)
    : 0;
  const liveMinutesIdle = Math.max(Number(link.minutesIdle || 0), calculatedIdle, 0);
  const decay = getDecayMetrics(liveMinutesIdle);
  const status = statusConfig[decay.phase] || statusConfig.fresh;
  const screenshotSrc = link.screenshot ? `${SERVER_URL}${link.screenshot}` : null;
  const isAiEnriching = !String(link.summary || '').trim();

  const cardVisualStyle = {
    '--decay-opacity': `${Math.max(0.45, 1 - decay.progress * 0.42)}`,
    opacity: 'var(--decay-opacity)',
    filter: `grayscale(${Math.round(decay.progress * 85)}%)`,
    transform: `scale(${(1 - decay.progress * 0.05).toFixed(3)})`,
    animation: decay.phase === 'fresh' ? 'none' : decay.phase === 'aging' ? 'decayFade 3.6s ease-in-out infinite alternate' : 'decayFade 2.2s ease-in-out infinite alternate',
    transition: 'opacity 320ms linear, filter 320ms linear, transform 320ms ease',
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const keepPopoverOpen = (type, ms = 1800) => {
    holdOpenUntilRef.current = Date.now() + ms;
    setActivePopover(type);
    clearCloseTimer();
  };

  const schedulePopoverClose = (baseDelay = 280) => {
    clearCloseTimer();
    const now = Date.now();
    const extraHold = Math.max(0, holdOpenUntilRef.current - now);
    const delay = Math.max(baseDelay, extraHold);
    closeTimerRef.current = window.setTimeout(() => {
      setActivePopover(null);
      closeTimerRef.current = null;
    }, delay);
  };

  useEffect(() => {
    setSuggestions(link.suggestions || []);
  }, [link.suggestions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick(Date.now());
    }, 20_000);
    return () => window.clearInterval(intervalId);
  }, []);

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
    const suggestionDeleteHandler = ({ linkId, suggestionId }) => {
      if (String(linkId) !== String(link._id)) return;
      setSuggestions((prev) => prev.filter((item) => String(item._id) !== String(suggestionId)));
    };
    s.on('reaction-update', handler);
    s.on('suggestion-update', suggestionHandler);
    s.on('suggestion-delete', suggestionDeleteHandler);
    return () => {
      s.off('reaction-update', handler);
      s.off('suggestion-update', suggestionHandler);
      s.off('suggestion-delete', suggestionDeleteHandler);
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
    type: item?.type || 'comment',
    text: item?.text || '',
    url: item?.url || null,
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
    if (activePopover) loadSuggestions();
  }, [activePopover]);

  useEffect(() => () => clearCloseTimer(), []);

  const handleAddSuggestion = async () => {
    const text = suggestionText.trim();
    if (!text || suggestionLoading) return;

    try {
      setSuggestionLoading(true);
      const { data } = await api.post(`/api/links/${link._id}/suggestions`, { type: 'comment', text });
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

  const handleAddReferenceLink = async () => {
    const url = referenceUrl.trim();
    const text = referenceNote.trim();
    if (!url || suggestionLoading) return;

    try {
      setSuggestionLoading(true);
      const { data } = await api.post(`/api/links/${link._id}/suggestions`, { type: 'link', url, text });
      setSuggestions((prev) => {
        if (prev.some((item) => String(item._id) === String(data?._id))) return prev;
        return [...prev, normalizeSuggestion(data)];
      });
      setReferenceUrl('');
      setReferenceNote('');
    } catch {
      // silent
    } finally {
      setSuggestionLoading(false);
    }
  };

  const canDeleteSuggestion = (item) => {
    const myId = String(user?._id || user?.id || '');
    const ownerId = String(item?.user?._id || item?.userId || '');
    return Boolean(myId && ownerId && myId === ownerId);
  };

  const handleDeleteSuggestion = async (suggestionId) => {
    if (!suggestionId || deletingSuggestionId) return;

    try {
      setDeletingSuggestionId(String(suggestionId));
      await api.delete(`/api/links/${link._id}/suggestions/${suggestionId}`);
      setSuggestions((prev) => prev.filter((item) => String(item._id) !== String(suggestionId)));
    } catch {
      // silent
    } finally {
      setDeletingSuggestionId(null);
    }
  };

  const commentSuggestions = suggestions.filter((item) => (item.type || 'comment') === 'comment');
  const linkSuggestions = suggestions.filter((item) => (item.type || 'comment') === 'link');

  const countReaction = (emoji) => reactions.filter((r) => r.emoji === emoji).length;

  return (
    <>
      <div
        className={`link-card-animate relative rounded-[20px] overflow-visible flex flex-col gap-0
          bg-white/45 backdrop-blur-xl border border-white/60
          shadow-lg hover:shadow-xl hover:-translate-y-1
          transition-all duration-300 ${isAiEnriching ? 'cursor-wait' : 'cursor-pointer'} group
          ${activePopover ? 'z-[120]' : 'z-0'}`}
        style={cardVisualStyle}
        onClick={() => {
          if (!isAiEnriching) setShowDetail(true);
        }}
        onKeyDown={(e) => {
          if (isAiEnriching) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetail(true);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="link-enriching-overlay" aria-hidden="true">
          <span className="link-enriching-blob link-enriching-blob-a" />
          <span className="link-enriching-blob link-enriching-blob-b" />
          <span className="link-enriching-blob link-enriching-blob-c" />
        </div>

        {isAiEnriching ? (
          <div className="link-card-loading-shell">
            <div className="link-card-loading-core">
              <span className="link-card-loading-ring" aria-hidden="true" />
              <p className="link-card-loading-title">Enriching with AI...</p>
              <p className="link-card-loading-subtitle">Analyzing the source, building summary, and tagging vibes.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Screenshot thumbnail */}
            {screenshotSrc && (
              <div className="h-32 w-full overflow-hidden rounded-t-[20px] bg-white/20">
                <img
                  src={screenshotSrc} alt={link.title}
                  className="w-full h-full object-cover object-top rounded-t-[20px]"
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
          {(decay.phase === 'aging' || decay.phase === 'dead') && (
            <p className="text-xs text-emerald-600 italic">⚠ Lifeline fading. Click "Open" to revive this link.</p>
          )}

          {/* Vibe Pills */}
          <VibePills vibes={link.vibes} />

          {/* Icon Reactions */}
          <div className="flex gap-1.5 flex-wrap">
            {REACTIONS.map(({ emoji, label, Icon }) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReact(emoji);
                }}
                title={label}
                aria-label={label}
                className="text-sm px-2 py-0.5 rounded-full bg-white/50 hover:bg-white/80 transition flex items-center gap-1"
              >
                <Icon size={14} className="text-[#364d70]" />
                {countReaction(emoji) > 0 && (
                  <span className="text-xs font-semibold text-[#1A1A2E]">{countReaction(emoji)}</span>
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
                {liveMinutesIdle < 1 ? 'Just added' : `Idle ${liveMinutesIdle}m`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="relative z-[130]"
                onMouseEnter={() => {
                  setActivePopover('comment');
                  clearCloseTimer();
                }}
                onMouseLeave={() => schedulePopoverClose(300)}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activePopover === 'comment') {
                      setActivePopover(null);
                      clearCloseTimer();
                      return;
                    }
                    keepPopoverOpen('comment', 1800);
                  }}
                  className="relative text-[#6B7280] hover:text-[#1A1A2E] transition"
                  title="Suggestions"
                  aria-label="Open suggestions"
                >
                  <MessageSquare size={16} />
                  {commentSuggestions.length > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-[16px] h-4 px-1 rounded-full bg-[#F4845F] text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {commentSuggestions.length > 99 ? '99+' : commentSuggestions.length}
                    </span>
                  )}
                </button>

                {activePopover === 'comment' && (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-[140] w-[270px] rounded-xl bg-white/95 border border-white/80 p-3 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => clearCloseTimer()}
                    onMouseLeave={() => schedulePopoverClose(320)}
                  >
                    <p className="text-[11px] font-semibold text-[#20314d] uppercase tracking-[0.14em]">Link Suggestions</p>
                    <p className="text-xs theme-muted mt-1">Collaborative notes for this link only.</p>

                    <div className="mt-2 max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {commentSuggestions.length === 0 ? (
                        <p className="text-xs theme-muted">No suggestions yet.</p>
                      ) : (
                        commentSuggestions.map((item) => (
                          <div key={item._id} className="rounded-lg bg-white/70 border border-white/80 px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-[#2b4265]">{item.user?.name || 'Unknown'}</p>
                              {canDeleteSuggestion(item) && (
                                <button
                                  onClick={() => handleDeleteSuggestion(item._id)}
                                  disabled={deletingSuggestionId === String(item._id)}
                                  title="Delete comment"
                                  aria-label="Delete comment"
                                  className="text-[#cc3d3d] hover:text-[#a92828] transition disabled:opacity-50"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-[#1A1A2E] leading-relaxed">{renderTextWithLinks(item.text)}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={() => keepPopoverOpen('comment', 3000)}
                        onBlur={() => schedulePopoverClose(550)}
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

              <div
                className="relative z-[130]"
                onMouseEnter={() => {
                  setActivePopover('link');
                  clearCloseTimer();
                }}
                onMouseLeave={() => schedulePopoverClose(300)}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activePopover === 'link') {
                      setActivePopover(null);
                      clearCloseTimer();
                      return;
                    }
                    keepPopoverOpen('link', 1800);
                  }}
                  className="relative text-[#6B7280] hover:text-[#1A1A2E] transition"
                  title="Link references"
                  aria-label="Open link references"
                >
                  <Link2 size={16} />
                  {linkSuggestions.length > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-[16px] h-4 px-1 rounded-full bg-[#4F46E5] text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {linkSuggestions.length > 99 ? '99+' : linkSuggestions.length}
                    </span>
                  )}
                </button>

                {activePopover === 'link' && (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-[140] w-[290px] rounded-xl bg-white/95 border border-white/80 p-3 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => clearCloseTimer()}
                    onMouseLeave={() => schedulePopoverClose(320)}
                  >
                    <p className="text-[11px] font-semibold text-[#20314d] uppercase tracking-[0.14em]">Linked References</p>
                    <p className="text-xs theme-muted mt-1">Add direct links related to this card.</p>

                    <div className="mt-2 max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {linkSuggestions.length === 0 ? (
                        <p className="text-xs theme-muted">No linked references yet.</p>
                      ) : (
                        linkSuggestions.map((item) => (
                          <div key={item._id} className="rounded-lg bg-white/70 border border-white/80 px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-[#2b4265]">{item.user?.name || 'Unknown'}</p>
                              {canDeleteSuggestion(item) && (
                                <button
                                  onClick={() => handleDeleteSuggestion(item._id)}
                                  disabled={deletingSuggestionId === String(item._id)}
                                  title="Delete linked reference"
                                  aria-label="Delete linked reference"
                                  className="text-[#cc3d3d] hover:text-[#a92828] transition disabled:opacity-50"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <a
                              href={toAbsoluteUrl(item.url || item.text)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#4F46E5] hover:underline break-all"
                            >
                              {item.url || item.text}
                            </a>
                            {item.text && item.url && item.text !== item.url && (
                              <p className="text-xs text-[#1A1A2E] leading-relaxed mt-0.5">{item.text}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 flex flex-col gap-1.5">
                      <input
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={() => keepPopoverOpen('link', 3000)}
                        onBlur={() => schedulePopoverClose(550)}
                        placeholder="Paste URL..."
                        className="w-full rounded-lg bg-white/85 border border-white/80 px-2.5 py-1.5 text-xs text-[#20314d] outline-none"
                      />
                      <input
                        value={referenceNote}
                        onChange={(e) => setReferenceNote(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={() => keepPopoverOpen('link', 3000)}
                        onBlur={() => schedulePopoverClose(550)}
                        placeholder="Optional note"
                        maxLength={300}
                        className="w-full rounded-lg bg-white/85 border border-white/80 px-2.5 py-1.5 text-xs text-[#20314d] outline-none"
                      />
                      <button
                        onClick={handleAddReferenceLink}
                        onKeyDown={(e) => e.stopPropagation()}
                        disabled={suggestionLoading || !referenceUrl.trim()}
                        className="self-end text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-[#4F46E5] text-white disabled:opacity-60"
                      >
                        Add Link
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
          </>
        )}
      </div>

      {showDetail && <LinkDetailModal link={link} onClose={() => setShowDetail(false)} />}
    </>
  );
}