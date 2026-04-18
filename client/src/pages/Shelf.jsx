import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import LinkInputBar from '../components/LinkInputBar';
import LinkCard from '../components/LinkCard';
import ShelfSwitcher from '../components/ShelfSwitcher';
import ShareShelfModal from '../components/ShareShelfModal';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../utils/socket';
import api from '../utils/api';

export default function Shelf() {
  const { id: shelfId } = useParams();
  const { user } = useAuth();
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
    if (!user || !shelfId) return;
    const s = getSocket();
    if (!s.connected) s.connect();
    s.emit('join-shelf', { shelfId, userName: user.name });

    s.on('link-created', (newLink) => {
      setLinks((prev) => prev.find((l) => l._id === newLink._id) ? prev : [newLink, ...prev]);
    });

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
      s.off('presence-update');
    };
  }, [user, shelfId]);

  const handleNewLink = (newLink) =>
    setLinks((prev) => prev.find((l) => l._id === newLink._id) ? prev : [newLink, ...prev]);

  // Weather computed from recent activity
  const recentCount = links.filter((l) => (Date.now() - new Date(l.createdAt)) / 60000 < 5).length;
  const weather = recentCount >= 3 ? '⛈ Stormy' : recentCount >= 1 ? '🌤 Breezy' : '🌫 Foggy';

  // Other users currently on this shelf (exclude self)
  const activeUsers = Object.values(presence).filter((name) => name !== user?.name);

  // Is current user the shelf owner?
  const isOwner = shelfData?.ownerId?._id === user?._id || shelfData?.ownerId === user?._id;

  return (
    <Layout>
      <div className="flex flex-col gap-8">
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

          {/* Right side controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShelfSwitcher />
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
      </div>

      {/* Share Modal */}
      {showShare && (
        <ShareShelfModal shelfId={shelfId} onClose={() => setShowShare(false)} />
      )}
    </Layout>
  );
}
