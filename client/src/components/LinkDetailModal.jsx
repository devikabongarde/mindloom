import { useState } from 'react';
import VibePills from './VibePills';
import api from '../utils/api';

export default function LinkDetailModal({ link, onClose }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  const fetchContext = () => {
    if (fetched) return;
    setLoading(true);
    setFetched(true);
    api.get(`/api/links/${link._id}/context`)
      .then(({ data }) => setContext(data))
      .catch(() => setError('Could not load context feed. Try again later.'))
      .finally(() => setLoading(false));
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="theme-modal rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col gap-5 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="theme-modal-content flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold leading-snug">{link.title}</h2>
              <a
                href={link.url} target="_blank" rel="noreferrer"
                className="text-xs text-[#F4845F] hover:underline mt-0.5 block truncate"
              >
                {link.url}
              </a>
            </div>
            <button onClick={onClose} className="theme-muted hover:text-[#1A1A2E] text-xl leading-none flex-shrink-0">✕</button>
          </div>

          {/* Original Summary */}
          <div className="bg-white/45 rounded-2xl p-4 flex flex-col gap-3 border border-white/60">
            <p className="theme-subtle-label font-semibold">Original Summary</p>
            <p className="text-sm leading-relaxed">{link.summary || 'No summary available.'}</p>
            <VibePills vibes={link.vibes} />
          </div>

          {/* Context Feed — lazy loaded on button press */}
          <div className="bg-white/45 rounded-2xl p-4 flex flex-col gap-3 border border-white/60">
            <div className="flex items-center justify-between">
              <p className="theme-subtle-label font-semibold">
                🔍 Context Feed
              </p>
              {!fetched && (
                <button
                  onClick={fetchContext}
                  className="theme-button text-xs font-semibold px-3 py-1 rounded-full hover:opacity-90 transition"
                >
                  What's new on this topic?
                </button>
              )}
            </div>

            {!fetched && (
              <p className="text-xs theme-muted italic">
                Click above to search the web for recent updates on this topic.
              </p>
            )}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F4845F] animate-bounce" />
                <p className="text-sm theme-muted animate-pulse">Searching the web for updates…</p>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            {context && !loading && (
              <>
                {/* AI Context Update */}
                <div className="bg-white/70 rounded-xl p-3 border border-[#F4845F]/20">
                  <p className="text-xs text-[#F4845F] font-semibold mb-1">AI Update</p>
                  <p className="text-sm leading-relaxed">{context.contextUpdate}</p>
                </div>

                {/* Recent Web Results */}
                {context.recentResults?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs theme-muted font-semibold">Recent results on this topic</p>
                    {context.recentResults.map((r, i) => (
                      <a
                        key={i} href={r.link} target="_blank" rel="noreferrer"
                        className="bg-white/60 rounded-xl px-3 py-2.5 flex flex-col gap-0.5 hover:bg-white/90 transition group"
                      >
                        <p className="text-sm font-medium group-hover:text-[#F4845F] transition line-clamp-1">
                          {r.title}
                        </p>
                        <p className="text-xs theme-muted line-clamp-2">{r.snippet}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs theme-muted italic">No recent web results found. AI update based on saved context only.</p>
                )}

                <p className="text-xs theme-muted text-right">
                  Searched at {new Date(context.searchedAt).toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
