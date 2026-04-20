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
  const [notificationPreview, setNotificationPreview] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

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
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/api/links/search/mine', {
          params: { q: query, limit: 6 },
        });
        if (!cancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearchLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationPreview = async () => {
      if (!user) {
        setNotificationPreview([]);
        setNotificationUnreadCount(0);
        return;
      }

      try {
        const { data } = await api.get('/api/social/notifications', { params: { limit: 3 } });
        if (cancelled) return;
        setNotificationPreview(Array.isArray(data?.notifications) ? data.notifications : []);
        setNotificationUnreadCount(Number(data?.unreadCount || 0));
      } catch {
        if (!cancelled) {
          setNotificationPreview([]);
          setNotificationUnreadCount(0);
        }
      }
    };

    loadNotificationPreview();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const totalLinkCount = dashboardLinks.length;
  const forkedShelfCount = Object.values(shelfIsForkedById).filter(Boolean).length;
  const latestLink = recentLinks[0] || null;
  const staleLinkCount = dashboardLinks.filter((link) => link.status === 'dead').length;
  const activeLinkCount = Math.max(totalLinkCount - staleLinkCount, 0);
  const activeRatio = totalLinkCount > 0 ? Math.round((activeLinkCount / totalLinkCount) * 100) : 0;
  const shelfCoverage = allShelfIds.length > 0 ? Math.round((forkedShelfCount / allShelfIds.length) * 100) : 0;

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
          <span className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold">Saved</span>
          <Link to="/shelf" className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform">Shelf</Link>
          <Link to="/compost" className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform">Compost</Link>
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
              className="theme-card rounded-[32px] p-5 md:p-6 lg:col-span-2"
              variants={cardVariants}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, scale: 1.002 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div className="theme-card-content grid gap-3 md:grid-cols-3">
                <div className="theme-panel rounded-[26px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="theme-subtle-label font-semibold">Saved</p>
                      <p className="text-2xl font-bold text-[#20314d] mt-1">{totalLinkCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/80 border border-white/85 flex items-center justify-center shadow-[0_10px_20px_rgba(132,158,202,0.16)]">
                      <div className="grid grid-cols-3 gap-[3px] h-5 items-end">
                        {[34, 58, 82].map((height) => (
                          <span
                            key={height}
                            className="w-1.5 rounded-full bg-gradient-to-t from-[#F4845F] to-[#E8617A]"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#F4845F] via-[#F7B8D7] to-[#7f9fd6]" style={{ width: `${Math.min(totalLinkCount * 12, 100)}%` }} />
                  </div>
                </div>

                <div className="theme-panel rounded-[26px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="theme-subtle-label font-semibold">Fresh</p>
                      <p className="text-2xl font-bold text-[#20314d] mt-1">{activeRatio}%</p>
                    </div>
                    <div
                      className="w-12 h-12 rounded-full border border-white/85 shadow-[0_10px_20px_rgba(132,158,202,0.16)]"
                      style={{ background: `conic-gradient(#F4845F ${activeRatio * 3.6}deg, rgba(95,116,152,0.18) 0deg)` }}
                    >
                      <div className="w-full h-full rounded-full grid place-items-center bg-white/75 backdrop-blur-sm">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A]" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#7f9fd6] to-[#F4845F]" style={{ width: `${activeRatio}%` }} />
                  </div>
                </div>

                <div className="theme-panel rounded-[26px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="theme-subtle-label font-semibold">Forked</p>
                      <p className="text-2xl font-bold text-[#20314d] mt-1">{forkedShelfCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/80 border border-white/85 flex items-center justify-center shadow-[0_10px_20px_rgba(132,158,202,0.16)] text-[#F4845F] text-sm font-bold">
                      {shelfCoverage}%
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <span
                        key={index}
                        className="flex-1 rounded-full bg-white/65 overflow-hidden h-2"
                      >
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-[#B7E7FF] via-[#F7B8D7] to-[#F4845F]"
                          style={{ width: `${Math.max(26, 100 - index * 14)}%` }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
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
              <div className="theme-card-content space-y-4">
                <p className="theme-subtle-label font-semibold">At a glance</p>
                <h2 className="text-2xl font-bold text-[#20314d]">Workspace snapshot</h2>
                <div className="grid grid-cols-3 gap-2">
                  <div className="theme-panel rounded-2xl px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.12em] theme-muted">Shelves</p>
                    <p className="text-lg font-bold text-[#20314d] mt-0.5">{allShelfIds.length}</p>
                  </div>
                  <div className="theme-panel rounded-2xl px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.12em] theme-muted">Links</p>
                    <p className="text-lg font-bold text-[#20314d] mt-0.5">{totalLinkCount}</p>
                  </div>
                  <div className="theme-panel rounded-2xl px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.12em] theme-muted">Forked</p>
                    <p className="text-lg font-bold text-[#20314d] mt-0.5">{forkedShelfCount}</p>
                  </div>
                </div>
              </div>
              <Link to="/knowledge-graph" className="mt-5 text-sm font-semibold text-[#F4845F] hover:underline">Open knowledge graph →</Link>
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
              <div className="theme-card-content space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="theme-subtle-label font-semibold">Notifications</p>
                    <h2 className="text-2xl font-bold text-[#20314d]">Inbox preview</h2>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4845F] bg-[#F4845F]/10 border border-[#F4845F]/20 rounded-full px-2 py-1">
                    {notificationUnreadCount} unread
                  </span>
                </div>

                {notificationPreview.length === 0 ? (
                  <p className="theme-muted text-sm leading-relaxed">No recent notifications. You are all caught up.</p>
                ) : (
                  <div className="space-y-2">
                    {notificationPreview.slice(0, 2).map((item) => (
                      <div key={item._id} className="theme-panel rounded-xl px-3 py-2.5">
                        <p className="text-sm font-semibold text-[#20314d] truncate">{item.title || 'Notification'}</p>
                        <p className="theme-muted text-xs truncate">{item.message || 'New activity in your network.'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/notifications" className="mt-5 text-sm font-semibold text-[#F4845F] hover:underline">Open notifications →</Link>
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
                  <p className="theme-subtle-label font-semibold mb-2">Action center</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#20314d]">Pick up exactly where you left off.</h2>
                  <p className="theme-muted text-sm md:text-base mt-3 leading-relaxed max-w-2xl">
                    {latestLink
                      ? `Latest saved: ${latestLink.title || getDomain(latestLink.url)}. Continue from your shelf, check your graph, or clear stale items in compost.`
                      : 'No links yet. Start by saving your first useful link, then organize and map it from Shelf and Knowledge Graph.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/shelf" className="theme-button rounded-full px-4 py-2 text-sm font-semibold">Open shelf</Link>
                    <Link to="/knowledge-graph" className="theme-button-secondary rounded-full px-4 py-2 text-sm font-semibold">View graph</Link>
                    <Link to="/compost" className="theme-button-secondary rounded-full px-4 py-2 text-sm font-semibold">Review compost</Link>
                  </div>
                </div>
                <div className="w-full md:w-[260px]">
                  <div className="theme-panel rounded-[28px] p-4">
                    <div className="theme-panel-content flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ffd8c8] via-[#f7b8d7] to-[#b7e7ff]" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#20314d]">{shelfState}</p>
                        <p className="text-xs theme-muted">
                          {latestLink
                            ? `${getDomain(latestLink.url)} · added ${new Date(latestLink.createdAt).toLocaleDateString()}`
                            : 'Create a shelf to unlock insights'}
                        </p>
                      </div>
                      <Link to="/shelf" className="w-8 h-8 rounded-full bg-white/80 border border-white/70 flex items-center justify-center text-[#F4845F]">
                        <ArrowUpRight size={16} />
                      </Link>
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
                    <p className="text-sm font-semibold text-[#20314d]">Today priorities</p>
                    <p className="text-xs theme-muted">Use this list to jump straight into pending work.</p>
                  </div>
                </div>

                <div className="theme-panel rounded-[24px] p-3 space-y-2">
                  <Link to="/notifications" className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/55 hover:bg-white/80 transition">
                    <span className="text-sm text-[#20314d]">Unread notifications</span>
                    <span className="text-xs font-semibold text-[#F4845F]">{notificationUnreadCount}</span>
                  </Link>
                  <Link to="/compost" className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/55 hover:bg-white/80 transition">
                    <span className="text-sm text-[#20314d]">Stale links in compost</span>
                    <span className="text-xs font-semibold text-[#F4845F]">{staleLinkCount}</span>
                  </Link>
                  <Link to="/shelf" className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/55 hover:bg-white/80 transition">
                    <span className="text-sm text-[#20314d]">Total saved links</span>
                    <span className="text-xs font-semibold text-[#F4845F]">{totalLinkCount}</span>
                  </Link>
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
                <p className="theme-subtle-label font-semibold">Quick jump</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/discover" className="theme-panel rounded-2xl px-3 py-3 text-sm font-semibold text-[#20314d] hover:bg-white/85 transition">Discover</Link>
                  <Link to="/notifications" className="theme-panel rounded-2xl px-3 py-3 text-sm font-semibold text-[#20314d] hover:bg-white/85 transition">Alerts</Link>
                  <Link to="/profile" className="theme-panel rounded-2xl px-3 py-3 text-sm font-semibold text-[#20314d] hover:bg-white/85 transition">Profile</Link>
                  <Link to="/knowledge-graph" className="theme-panel rounded-2xl px-3 py-3 text-sm font-semibold text-[#20314d] hover:bg-white/85 transition">Graph</Link>
                </div>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
