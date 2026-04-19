import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ArrowUpRight, GitFork, Star } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function sortShelves(items) {
  return [...items].sort((a, b) => {
    const starDelta = (b.starCount || 0) - (a.starCount || 0);
    if (starDelta !== 0) return starDelta;
    const reactionDelta = (b.totalReactions || 0) - (a.totalReactions || 0);
    if (reactionDelta !== 0) return reactionDelta;
    return new Date(b.latestActivityAt || 0) - new Date(a.latestActivityAt || 0);
  });
}

export default function StarredShelves() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    let cancelled = false;

    api.get('/api/social/feed', { params: { limit: 100 } })
      .then(({ data }) => {
        if (cancelled) return;
        const normalized = Array.isArray(data) ? data : [];
        setFeed(sortShelves(normalized));
      })
      .catch(() => {
        if (!cancelled) setFeed([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const starredShelves = useMemo(
    () => feed.filter((item) => Boolean(item?.starredByMe)),
    [feed]
  );

  const handleStarToggle = async (shelfId) => {
    try {
      const { data } = await api.post(`/api/shelves/${shelfId}/star`);
      setFeed((prev) => sortShelves(prev.map((item) => {
        if (item._id !== shelfId) return item;
        return {
          ...item,
          starCount: data.starCount,
          starredByMe: data.starred,
        };
      })));
    } catch {
      // keep silent to avoid noisy UX
    }
  };

  const handleForkShelf = async (shelf) => {
    const defaultName = `${shelf.name} Fork`;
    const name = window.prompt('Name your forked shelf:', defaultName);
    if (!name?.trim()) return;

    try {
      const { data } = await api.post('/api/shelves/fork', {
        sourceShelfId: shelf._id,
        newName: name.trim(),
      });

      if (data?._id) navigate(`/shelf/${data._id}`);
    } catch {
      // keep silent to avoid noisy UX
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 min-h-[60vh]">
        <section className="theme-card rounded-[28px] p-6">
          <div className="theme-card-content flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="theme-subtle-label font-semibold">Starred</p>
              <h1 className="theme-hero-title text-3xl md:text-4xl font-bold">Your starred shelves</h1>
              <p className="theme-muted mt-2 max-w-2xl">Quick access to public shelves you starred.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f7498] bg-white/70 border border-white/70 rounded-full px-3 py-1">
              <Star size={13} />
              {starredShelves.length}
            </span>
          </div>
        </section>

        <section className="theme-card rounded-[28px] p-5 md:p-6">
          <div className="theme-card-content">
            {loading ? (
              <p className="theme-muted text-sm">Loading starred shelves...</p>
            ) : starredShelves.length === 0 ? (
              <div className="rounded-2xl bg-white/55 border border-white/70 p-4">
                <p className="theme-muted text-sm">No starred shelves yet. Star shelves from Discover to see them here.</p>
                <RouterLink to="/discover" className="theme-link text-xs font-semibold mt-2 inline-block">
                  Go to Discover
                </RouterLink>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {starredShelves.map((item, index) => (
                  <div
                    key={item._id}
                    className="bg-white/55 border border-white/70 rounded-2xl p-4 hover:bg-white/85 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F4845F]">#{index + 1}</span>
                      <span className="text-[11px] theme-muted">{item.starCount || 0} stars</span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-[#20314d] line-clamp-2">{item.name || 'Public Shelf'}</h3>
                    <p className="mt-2 text-xs theme-muted">{item.totalLinks || 0} links · {item.totalReactions || 0} reactions</p>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {(item.previewLinks || []).length === 0 ? (
                        <p className="text-xs theme-muted">No preview links yet.</p>
                      ) : (
                        (item.previewLinks || []).map((preview) => (
                          <p key={preview._id} className="text-xs text-[#2b4265] truncate">
                            {preview.title || getDomain(preview.url)}
                          </p>
                        ))
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs theme-muted">
                      <span>by {item.ownerName || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStarToggle(item._id)}
                          title="Unstar shelf"
                          aria-label="Unstar shelf"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-[#F4845F] border-[#F4845F]/25 bg-[#F4845F]/10"
                        >
                          <Star size={15} fill="currentColor" />
                        </button>
                        <button
                          onClick={() => handleForkShelf(item)}
                          title="Fork shelf"
                          aria-label="Fork shelf"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#5f7498] transition hover:bg-white/90"
                        >
                          <GitFork size={15} />
                        </button>
                        <RouterLink to={`/shelf/${item._id}`} className="theme-link font-semibold">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#5f7498] transition hover:bg-white/90" title="Open shelf" aria-label="Open shelf">
                            <ArrowUpRight size={15} />
                          </span>
                        </RouterLink>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
