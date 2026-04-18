import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.995 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const [allShelfIds, setAllShelfIds] = useState([]);
  const [shelfNameById, setShelfNameById] = useState({});
  const [shelfIsForkedById, setShelfIsForkedById] = useState({});
  const shelfState = allShelfIds.length > 0 ? 'Shelves synced' : 'Set up your first shelf';
  const [now, setNow] = useState(new Date());
  const [dashboardLinks, setDashboardLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadShelves = async () => {
      if (!user) {
        setAllShelfIds([]);
        return;
      }

      try {
        const { data } = await api.get('/api/shelves/mine');
        const shelves = Array.isArray(data) ? data : [];
        if (cancelled) return;
        setAllShelfIds(shelves.map((s) => s._id));
        setShelfNameById(Object.fromEntries(shelves.map((s) => [String(s._id), s.name])));
        setShelfIsForkedById(Object.fromEntries(shelves.map((s) => [String(s._id), Boolean(s.parentShelfId)])));
      } catch {
        if (!cancelled) {
          setAllShelfIds([]);
          setShelfNameById({});
          setShelfIsForkedById({});
        }
      }
    };

    loadShelves();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (allShelfIds.length === 0) {
      setDashboardLinks([]);
      return;
    }

    let cancelled = false;
    setLinksLoading(true);

    Promise.all(
      allShelfIds.map((id) =>
        api.get(`/api/links/shelf/${id}`)
          .then(({ data }) => (Array.isArray(data) ? data : []))
          .catch(() => [])
      )
    )
      .then((resultSets) => {
        if (cancelled) return;
        const merged = resultSets.flat();
        const deduped = [...new Map(merged.map((link) => [String(link._id), link])).values()];
        setDashboardLinks(deduped);
      })
      .catch(() => {
        if (!cancelled) setDashboardLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLinksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [allShelfIds]);

  useEffect(() => {
    if (allShelfIds.length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timer = window.setTimeout(() => {
      const normalizedQuery = query.toLowerCase();
      const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

      const scored = dashboardLinks
        .map((link) => {
          const haystack = [
            link.title || '',
            link.summary || '',
            link.url || '',
            Array.isArray(link.vibes) ? link.vibes.join(' ') : '',
          ].join(' ').toLowerCase();

          let score = 0;
          if (haystack.includes(normalizedQuery)) score += 4;
          tokens.forEach((token) => {
            if (haystack.includes(token)) score += 1;
          });

          return {
            link,
            score,
            recency: toTime(link.lastClickedAt || link.createdAt),
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => (b.score - a.score) || (b.recency - a.recency))
        .slice(0, 6)
        .map((item) => item.link);

      if (!cancelled) {
        setSearchResults(scored);
        setSearchLoading(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, allShelfIds, dashboardLinks]);

  const hour = now.getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? 'Good morning'
      : hour >= 12 && hour < 17
        ? 'Good afternoon'
        : hour >= 17 && hour < 21
          ? 'Good evening'
          : 'Good night';

  const toTime = (value) => {
    const ts = value ? new Date(value).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
  };

  const hotLinks = [...dashboardLinks]
    .sort((a, b) => toTime(b.lastClickedAt || b.createdAt) - toTime(a.lastClickedAt || a.createdAt))
    .slice(0, 3);

  const recentLinks = [...dashboardLinks]
    .sort((a, b) => toTime(b.createdAt || b.lastClickedAt) - toTime(a.createdAt || a.lastClickedAt))
    .slice(0, 3);

  const formatMinutesIdle = (minutesIdle) => {
    if (typeof minutesIdle !== 'number' || Number.isNaN(minutesIdle)) return 'now';
    if (minutesIdle < 1) return 'now';
    if (minutesIdle < 60) return `${minutesIdle}m ago`;
    const hours = Math.floor(minutesIdle / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  };

  const getInitial = (title, url) => {
    const seed = (title || url || '?').trim();
    return seed ? seed.charAt(0).toUpperCase() : '?';
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 min-h-[60vh]">
        <div className="flex flex-wrap gap-3 items-center justify-center lg:justify-start">
          <span className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold">Mindfulness</span>
          <Link to="/shelf" className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform">Focus</Link>
          <Link to="/compost" className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform">Relaxation</Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] auto-rows-min">
            <motion.section
              className="theme-card rounded-[32px] p-6 md:p-8 min-h-[220px] flex flex-col justify-between lg:col-span-2"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.04}
              whileHover={{ y: -4, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content max-w-3xl">
                <p className="theme-subtle-label font-semibold mb-3">General</p>
                <h1 className="theme-hero-title text-4xl md:text-5xl font-bold leading-tight max-w-2xl">
                  {greeting}, {firstName}. What’s on your shelf?
                </h1>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/shelf" className="theme-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold">
                  Open shelf
                </Link>
                <Link to="/profile" className="theme-button-secondary inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold">
                  View profile
                </Link>
              </div>
            </motion.section>

            <motion.section
              className="theme-card rounded-[32px] p-6 min-h-[250px] lg:col-span-2"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.18}
              whileHover={{ y: -3, scale: 1.003 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="theme-subtle-label font-semibold">Insights</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-[#20314d]">Hot Links and Recent Links</h3>
                    <p className="theme-muted text-sm mt-1">Your most revisited links and your latest additions, all in one glance.</p>
                  </div>
                  <Link to="/shelf" className="theme-button-secondary text-sm font-semibold rounded-full px-4 py-2 hover:underline">See all in shelf →</Link>
                </div>

                {linksLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[0, 1].map((col) => (
                      <div key={col} className="bg-white/45 rounded-2xl p-4 border border-white/60">
                        <div className="h-4 w-28 rounded-full bg-white/70 animate-pulse mb-3" />
                        <div className="space-y-2">
                          {[0, 1, 2].map((row) => (
                            <div key={row} className="h-12 rounded-xl bg-white/60 animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : dashboardLinks.length === 0 ? (
                  <div className="bg-white/45 rounded-2xl p-5 border border-white/60">
                    <p className="theme-muted text-sm">Add a few links in your shelf and this panel will highlight your most active and most recent ones.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-white/45 rounded-2xl p-4 border border-white/60">
                      <div className="flex items-center justify-between mb-3">
                        <p className="theme-subtle-label font-semibold">Hot Links</p>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4845F] bg-[#F4845F]/10 border border-[#F4845F]/20 rounded-full px-2 py-1">Most visited</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {hotLinks.length === 0 ? (
                          <p className="text-xs theme-muted">No activity yet. Open a few links and they will appear here.</p>
                        ) : hotLinks.map((item, index) => (
                          <motion.a
                            key={`hot-${item._id}`}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-white/60 hover:bg-white/90 border border-transparent hover:border-white/70 transition"
                            whileHover={{ x: 2 }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#20314d] truncate">{item.title || item.url}</p>
                                <p className="text-xs theme-muted truncate">{getDomain(item.url)} · active {formatMinutesIdle(item.minutesIdle)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f7498] bg-white/70 border border-white/80 rounded-full px-2 py-0.5">
                                {shelfNameById[String(item.shelfId)] || 'Unknown shelf'}
                              </span>
                              {shelfIsForkedById[String(item.shelfId)] && (
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F4845F] bg-[#F4845F]/10 border border-[#F4845F]/20 rounded-full px-2 py-0.5">
                                  Forked
                                </span>
                              )}
                              <ArrowUpRight size={15} className="text-[#F4845F]" />
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/45 rounded-2xl p-4 border border-white/60">
                      <div className="flex items-center justify-between mb-3">
                        <p className="theme-subtle-label font-semibold">Recent Links</p>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f7498] bg-white/60 border border-white/70 rounded-full px-2 py-1">Latest saved</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {recentLinks.length === 0 ? (
                          <p className="text-xs theme-muted">No links added yet. Save links to see recent activity.</p>
                        ) : recentLinks.map((item) => (
                          <motion.a
                            key={`recent-${item._id}`}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-white/60 hover:bg-white/90 border border-transparent hover:border-white/70 transition"
                            whileHover={{ x: 2 }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-white/90 border border-white/80 text-[#20314d] text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {getInitial(item.title, item.url)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#20314d] truncate">{item.title || item.url}</p>
                                <p className="text-xs theme-muted truncate">{getDomain(item.url)} · added {new Date(item.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f7498] bg-white/70 border border-white/80 rounded-full px-2 py-0.5">
                                {shelfNameById[String(item.shelfId)] || 'Unknown shelf'}
                              </span>
                              {shelfIsForkedById[String(item.shelfId)] && (
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F4845F] bg-[#F4845F]/10 border border-[#F4845F]/20 rounded-full px-2 py-0.5">
                                  Forked
                                </span>
                              )}
                              <ArrowUpRight size={15} className="text-[#F4845F]" />
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section
              className="theme-card rounded-[32px] p-6 min-h-[180px] flex flex-col justify-between"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.08}
              whileHover={{ y: -3, scale: 1.004 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content space-y-2">
                <p className="theme-subtle-label font-semibold">Meditate</p>
                <h2 className="text-2xl font-bold text-[#20314d]">Capture and curate</h2>
                <p className="theme-muted text-sm leading-relaxed">Drop links into your shelf and let ShelfLife organize them into a living archive.</p>
              </div>
              <Link to="/shelf" className="mt-5 text-sm font-semibold text-[#F4845F] hover:underline">Go to shelf →</Link>
            </motion.section>

            <motion.section
              className="theme-card rounded-[32px] p-6 min-h-[180px] flex flex-col justify-between"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.12}
              whileHover={{ y: -3, scale: 1.004 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content space-y-2">
                <p className="theme-subtle-label font-semibold">Music</p>
                <h2 className="text-2xl font-bold text-[#20314d]">Recent activity</h2>
                <p className="theme-muted text-sm leading-relaxed">The same soft-glass surface now frames your shelf, compost, and profile actions.</p>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] opacity-90" />
                <div>
                  <p className="text-sm font-semibold text-[#20314d]">{shelfState}</p>
                  <p className="text-xs theme-muted">{allShelfIds.length > 0 ? 'Insights across all your shelves' : 'Create a shelf to unlock insights'}</p>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="theme-card rounded-[32px] p-6 min-h-[210px] flex flex-col justify-between lg:col-span-2"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.16}
              whileHover={{ y: -4, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="theme-subtle-label font-semibold mb-2">Move</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#20314d]">Your shelf is active and your archive is alive.</h2>
                  <p className="theme-muted text-sm md:text-base mt-3 leading-relaxed max-w-2xl">This area can hold the same short-form guidance, search, or quick shortcuts from the reference layout without changing any backend behavior.</p>
                </div>
                <div className="w-full md:w-[260px]">
                  <div className="theme-panel rounded-[28px] p-4">
                    <div className="theme-panel-content flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ffd8c8] via-[#f7b8d7] to-[#b7e7ff]" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#20314d]">Ease into shelf mode</p>
                        <p className="text-xs theme-muted">Mindful organization · 5 min</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/80 border border-white/70 flex items-center justify-center text-[#F4845F]">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

          </div>

          <aside className="grid gap-6 auto-rows-min">
            <motion.div
              className="theme-card rounded-[28px] p-4"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.2}
              whileHover={{ y: -3, scale: 1.004 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content space-y-3">
                <div className="flex items-center gap-2">
                  <div className="theme-panel rounded-full flex-1 flex items-center gap-3 px-4 py-2.5">
                    <Search size={16} className="theme-muted flex-shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Search across all your shelves…"
                      className="bg-transparent outline-none border-none w-full text-sm text-[#20314d] placeholder:text-[#8aa0c1]"
                    />
                  </div>
                </div>

                {searchOpen && searchQuery.trim() && (
                  <div className="bg-white/50 border border-white/70 rounded-2xl p-3">
                    {searchLoading ? (
                      <p className="theme-muted text-sm">Searching by meaning…</p>
                    ) : searchResults.length === 0 ? (
                      <p className="theme-muted text-sm">No semantic matches found for this query.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {searchResults.map((item) => (
                          <a
                            key={item._id}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 bg-white/60 hover:bg-white/85 transition"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#20314d] truncate">{item.title || item.url}</p>
                              <p className="text-xs theme-muted truncate">{item.summary || item.url}</p>
                            </div>
                            <ArrowUpRight size={14} className="text-[#F4845F] flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              className="theme-card rounded-[28px] p-5"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.24}
              whileHover={{ y: -3, scale: 1.004 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] flex items-center justify-center text-white shadow-lg shadow-[#F4845F]/30">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#20314d]">{allShelfIds.length > 0 ? 'Shelves ready' : 'Shelf setup needed'}</p>
                    <p className="text-xs theme-muted">{allShelfIds.length > 0 ? 'Using all your shelves for dashboard insights.' : 'Create your first shelf to unlock this view.'}</p>
                  </div>
                </div>

                <div className="theme-panel rounded-[24px] p-4">
                  <p className="theme-subtle-label font-semibold mb-1">Now</p>
                  <p className="theme-muted text-sm leading-relaxed">Open the shelf, inspect compost, or review your profile. All interactions keep working as before.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="theme-card rounded-[28px] p-5"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0.28}
              whileHover={{ y: -3, scale: 1.004 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content space-y-4">
                <p className="theme-subtle-label font-semibold">Ask anything…</p>
                <div className="theme-panel rounded-full flex items-center gap-3 px-4 py-3">
                  <span className="theme-muted text-sm flex-1">Type a shortcut or jump route</span>
                  <div className="w-8 h-8 rounded-full bg-white/80 border border-white/70 flex items-center justify-center text-[#F4845F]">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
