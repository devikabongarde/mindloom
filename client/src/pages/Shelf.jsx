import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LinkInputBar from '../components/LinkInputBar';
import LinkCard from '../components/LinkCard';
import ShelfSwitcher from '../components/ShelfSwitcher';
import ShareShelfModal from '../components/ShareShelfModal';
import LiveCursors from '../components/LiveCursors';
import LineagePanel from '../components/LineagePanel';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';
import api from '../utils/api';

function isPendingEnrichment(link) {
  if (!link) return false;
  const summaryMissing = !link.summary || !link.summary.trim();
  const vibesMissing = !Array.isArray(link.vibes) || link.vibes.length === 0;
  const titleFallback = link.title === link.url;
  return summaryMissing || vibesMissing || titleFallback;
}

export default function Shelf() {
  const { id: shelfId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [shelfData, setShelfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState({});
  const [showShare, setShowShare] = useState(false);

  // Fetch shelf info + links on mount / shelfId change
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/shelves/${shelfId}`),
      api.get(`/api/links/shelf/${shelfId}`),
    ]).then(([resShelf, resLinks]) => {
      setShelfData(resShelf.data);
      setLinks(resLinks.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [shelfId]);

  // Socket.IO: join room, listen for live events
  useEffect(() => {
    const s = getSocket();
    if (!s || !user || !shelfId) return;
    
    if (!s.connected) s.connect();
    s.emit('join-shelf', { shelfId, userName: user.name });

    s.on('link-created',  (newLink)  => setLinks((prev) => prev.find((l) => l._id === newLink._id) ? prev : [newLink, ...prev]));
    s.on('link-enriched', (enriched) => setLinks((prev) => prev.map((l) => l._id === enriched._id ? { ...l, ...enriched } : l)));
    s.on('presence-update', (evt) => {
      setPresence((prev) => {
        const copy = { ...prev };
        if (evt.type === 'join') copy[evt.socketId] = evt.userName;
        if (evt.type === 'leave') delete copy[evt.socketId];
        return copy;
      });
    });

    return () => {
      s.emit('leave-shelf');
      s.off('link-created');
      s.off('link-enriched');
      s.off('presence-update');
    };
  }, [user, shelfId]);

  // Fallback: when realtime is disabled, poll while links are still enriching.
  useEffect(() => {
    if (!shelfId) return;

    const hasPending = links.some(isPendingEnrichment);
    if (!hasPending) return;

    const intervalId = window.setInterval(async () => {
      try {
        const { data } = await api.get(`/api/links/shelf/${shelfId}`);
        setLinks(data);
      } catch {
        // Best-effort UI refresh; keep silent to avoid noisy errors.
      }
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [links, shelfId]);

  const handleNewLink = (newLink) =>
    setLinks((prev) => prev.find((l) => l._id === newLink._id) ? prev : [newLink, ...prev]);

  const handleFork = async () => {
    const name = window.prompt('Name your forked shelf:');
    if (!name?.trim()) return;
    try {
      const { data } = await api.post('/api/shelves/fork', { sourceShelfId: shelfId, newName: name.trim() });
      navigate(`/shelf/${data._id}`);
    } catch {
      alert('Could not fork this shelf. You may not have access.');
    }
  };

  const recentCount = links.filter((l) => (Date.now() - new Date(l.createdAt)) / 60000 < 5).length;
  const weather = recentCount >= 3 ? '⛈ Stormy' : recentCount >= 1 ? '🌤 Breezy' : '🌫 Foggy';
  const activeUsers = Object.values(presence).filter((name) => name !== user?.name);
  const isOwner = shelfData?.ownerId?._id === user?._id ||
                  shelfData?.ownerId?._id === user?.id  ||
                  String(shelfData?.ownerId) === String(user?._id || user?.id);

  return (
    <Layout>
      {/* shelf-container is relative so LiveCursors can position absolutely inside */}
      <div id="shelf-container" className="relative flex flex-col gap-8">
        <LiveCursors shelfId={shelfId} currentUser={user} />

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A2E]">
              {shelfData ? shelfData.name : 'Loading shelf…'}
            </h1>
            {user?.curatorArchetype && (
              <p className="text-xs text-[#6B7280] mt-1">
                You are a <span className="font-semibold">{user.curatorArchetype.name}</span>.
              </p>
            )}
            {activeUsers.length > 0 && (
              <p className="text-xs text-[#6B7280] mt-0.5 italic">
                Live now: {activeUsers.join(', ')}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <ShelfSwitcher />
            <button
              onClick={handleFork}
              className="text-xs font-semibold text-[#6B7280] bg-white/70 border border-white/80 rounded-full px-3 py-1.5 hover:bg-white transition"
            >
              🌿 Fork
            </button>
            {isOwner && (
              <button
                onClick={() => setShowShare(true)}
                className="text-xs font-semibold text-[#F4845F] bg-white/70 border border-white/80 rounded-full px-3 py-1.5 hover:bg-white transition"
              >
                Share shelf
              </button>
            )}
            <span className="text-sm font-medium text-[#6B7280] bg-white/50 border border-white/60 rounded-full px-4 py-1.5 backdrop-blur">
              {weather}
            </span>
          </div>
        </div>

        {/* URL Input */}
        <LinkInputBar shelfId={shelfId} onLinkCreated={handleNewLink} />

        {/* Link Grid */}
        {loading ? (
          <p className="text-[#6B7280] text-center mt-12">Loading your shelf…</p>
        ) : links.length === 0 ? (
          <p className="text-[#6B7280] text-center mt-12">
            Your shelf is empty. Drop a link above to bring it to life. 🌱
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map((link) => <LinkCard key={link._id} link={link} />)}
          </div>
        )}

        {/* Lineage Panel — only shows if this shelf was forked or has forks */}
        <LineagePanel shelfId={shelfId} />
      </div>

      {showShare && <ShareShelfModal shelfId={shelfId} onClose={() => setShowShare(false)} />}
    </Layout>
  );
}