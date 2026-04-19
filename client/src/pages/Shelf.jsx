import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Users } from 'lucide-react';
import Layout from '../components/Layout';
import LinkInputBar from '../components/LinkInputBar';
import LinkCard from '../components/LinkCard';
import ShareShelfModal from '../components/ShareShelfModal';
import ManageMembersModal from '../components/ManageMembersModal';
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
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [shelfData, setShelfData] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shelvesLoading, setShelvesLoading] = useState(true);
  const [presence, setPresence] = useState({});
  const [showShare, setShowShare] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfPublic, setNewShelfPublic] = useState(false);
  const [creatingShelf, setCreatingShelf] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShelvesLoading(true);
    Promise.all([
      api.get(`/api/shelves/${shelfId}`),
      api.get(`/api/links/shelf/${shelfId}`),
      api.get('/api/shelves/mine'),
    ]).then(([resShelf, resLinks, resShelves]) => {
      setShelfData(resShelf.data);
      setLinks(resLinks.data);
      setShelves(Array.isArray(resShelves.data) ? resShelves.data : []);
    }).catch(console.error)
      .finally(() => {
        setLoading(false);
        setShelvesLoading(false);
      });
  }, [shelfId]);

  // Socket.IO: join room, listen for live events (only for shared shelves, not forks)
  useEffect(() => {
    const s = getSocket();
    if (!s || !user || !shelfId || !shelfData) return;
    
    // Only enable realtime for shared shelves (members > 1), not forked shelves
    const isSharedShelf = shelfData.members?.length > 1;
    const isForkedShelf = !!shelfData.parentShelfId;
    
    if (!isSharedShelf || isForkedShelf) return;
    
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
  }, [user, shelfId, shelfData]);

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

  const handleDeleteLink = async (linkId) => {
    const ok = window.confirm('Delete this link? This action cannot be undone.');
    if (!ok) return;

    try {
      await api.delete(`/api/links/${linkId}`);
      setLinks((prev) => prev.filter((l) => String(l._id) !== String(linkId)));
    } catch {
      alert('Could not delete link.');
    }
  };

  const handleDeleteShelf = async (targetShelfId, targetShelfName = 'this shelf') => {
    const confirmationToken = 'DELETE';
    const typed = window.prompt(
      `To delete "${targetShelfName}", type ${confirmationToken}`
    );
    if (typed !== confirmationToken) {
      if (typed !== null) alert('Deletion cancelled. Confirmation text did not match.');
      return;
    }

    try {
      await api.delete(`/api/shelves/${targetShelfId}`);
      const { data: remainingShelves } = await api.get('/api/shelves/mine');
      const normalized = Array.isArray(remainingShelves) ? remainingShelves : [];
      setShelves(normalized);

      const targetWasCurrent = String(targetShelfId) === String(shelfId);
      const targetWasDefault = String(user?.defaultShelfId || '') === String(targetShelfId);

      if (normalized.length > 0 && (targetWasCurrent || targetWasDefault)) {
        const nextShelfId = normalized[0]._id;
        try {
          await api.patch('/api/auth/me', { defaultShelfId: nextShelfId });
          const token = localStorage.getItem('shelflife_token');
          if (token && user) {
            login(token, { ...user, defaultShelfId: nextShelfId });
          }
        } catch {
          // Non-fatal: navigation still works even if default update fails.
        }
      }

      if (targetWasCurrent) {
        if (normalized.length > 0) navigate(`/shelf/${normalized[0]._id}`);
        else navigate('/shelf');
      }
    } catch {
      alert('Could not delete shelf.');
    }
  };

  const handleCreateShelf = async () => {
    const name = newShelfName.trim();
    if (!name || creatingShelf) return;

    try {
      setCreatingShelf(true);
      const { data } = await api.post('/api/shelves', {
        name,
        isPublic: newShelfPublic,
        weather: 'Foggy',
      });

      try {
        await api.patch('/api/auth/me', { defaultShelfId: data._id });
        const token = localStorage.getItem('shelflife_token');
        if (token && user) {
          login(token, { ...user, defaultShelfId: data._id });
        }
      } catch {
        // Non-fatal: shelf still exists even if default update fails.
      }

      setNewShelfName('');
      setNewShelfPublic(false);
      const refreshedShelves = await api.get('/api/shelves/mine');
      setShelves(Array.isArray(refreshedShelves.data) ? refreshedShelves.data : []);
      navigate(`/shelf/${data._id}`);
    } catch {
      alert('Could not create shelf. Please try again.');
    } finally {
      setCreatingShelf(false);
    }
  };

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

  const toggleVisibility = async () => {
    if (!shelfData?._id || !isOwner || visibilityUpdating) return;
    setVisibilityUpdating(true);
    try {
      const { data } = await api.patch(`/api/shelves/${shelfData._id}/toggle-public`, {
        isPublic: !shelfData.isPublic
      });
      setShelfData((prev) => (prev ? { ...prev, isPublic: data.isPublic } : prev));
    } catch {
      alert('Could not update shelf visibility.');
    } finally {
      setVisibilityUpdating(false);
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
      <div id="shelf-container" className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          {shelfData?.members?.length > 1 && !shelfData?.parentShelfId && (
            <LiveCursors shelfId={shelfId} currentUser={user} />
          )}

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
              {!isOwner && (
              <button
                onClick={handleFork}
                className="text-xs font-semibold text-[#6B7280] bg-white/70 border border-white/80 rounded-full px-3 py-1.5 hover:bg-white transition"
              >
                🌿 Fork
              </button>
              )}
              {isOwner && !shelfData?.parentShelfId && (
                <button
                  onClick={toggleVisibility}
                  disabled={visibilityUpdating}
                  className="text-xs font-semibold text-[#6B7280] bg-white/70 border border-white/80 rounded-full px-3 py-1.5 hover:bg-white transition disabled:opacity-60"
                >
                  {visibilityUpdating ? 'Updating...' : shelfData?.isPublic ? '🌍 Public' : '🔒 Private'}
                </button>
              )}
              {isOwner && !shelfData?.parentShelfId && (
                <button
                  onClick={() => setShowManageMembers(true)}
                  className="text-xs font-semibold text-[#6B7280] bg-white/70 border border-white/80 rounded-full px-3 py-1.5 hover:bg-white transition flex items-center gap-1"
                  title="Manage members"
                >
                  <Users size={14} />
                  Members
                </button>
              )}
              {isOwner && !shelfData?.parentShelfId && (
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
              {links.map((link) => {
                const linkOwnerId = link.addedBy?._id || link.addedBy;
                const canDeleteLink = isOwner || String(linkOwnerId || '') === String(user?._id || user?.id || '');
                return (
                  <LinkCard
                    key={link._id}
                    link={link}
                    canDelete={canDeleteLink}
                    onDelete={() => handleDeleteLink(link._id)}
                  />
                );
              })}
            </div>
          )}

          {/* Lineage Panel — only shows if this shelf was forked or has forks */}
          <LineagePanel shelfId={shelfId} />
        </div>

        <aside className="theme-card rounded-[28px] p-5 md:p-6 xl:sticky xl:top-4 xl:mb-4 self-start xl:h-[calc(100vh-2rem)] xl:max-h-[calc(100vh-2rem)]">
          <div className="theme-card-content flex h-full max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden">
            <div>
              <p className="theme-subtle-label font-semibold">Your Shelves</p>
              <h2 className="text-2xl md:text-3xl font-bold text-[#20314d]">Browse shelves</h2>
              <p className="theme-muted text-sm mt-1">Create a shelf first, then browse the rest underneath it.</p>
            </div>

            <div className="theme-panel rounded-2xl p-4 shrink-0">
              <p className="text-xs theme-muted uppercase tracking-[0.18em]">Create Shelf</p>
              <h3 className="mt-2 text-lg font-bold text-[#20314d]">Add a new shelf</h3>
              <div className="mt-4 flex flex-col gap-3">
                <input
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="New shelf name"
                  className="w-full rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] placeholder:text-[#8aa0c1] outline-none"
                />
                <label className="inline-flex items-center gap-2 text-xs theme-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newShelfPublic}
                    onChange={(e) => setNewShelfPublic(e.target.checked)}
                  />
                  Make this shelf public
                </label>
                <button
                  onClick={handleCreateShelf}
                  disabled={creatingShelf || !newShelfName.trim()}
                  className="theme-button rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-70"
                >
                  {creatingShelf ? 'Creating…' : 'Create shelf'}
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 pb-4">
              {(shelvesLoading ? Array.from({ length: 3 }) : shelves).map((shelf, index) => {
                if (shelvesLoading) {
                  return (
                    <div key={`skeleton-${index}`} className="rounded-2xl bg-white/45 border border-white/60 p-4 animate-pulse">
                      <div className="h-4 w-24 rounded-full bg-white/70" />
                      <div className="mt-3 h-5 w-40 rounded-full bg-white/70" />
                      <div className="mt-3 h-3 w-28 rounded-full bg-white/70" />
                    </div>
                  );
                }

                const isCurrent = String(shelf._id) === String(shelfId);
                const shelfOwnerId = shelf?.ownerId?._id || shelf?.ownerId;
                const isShelfOwner = String(shelfOwnerId || '') === String(user?._id || user?.id || '');
                return (
                  <div
                    key={shelf._id}
                    onClick={() => navigate(`/shelf/${shelf._id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/shelf/${shelf._id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`text-left rounded-2xl border p-4 transition cursor-pointer ${isCurrent ? 'bg-white/85 border-[#F4845F]/40 shadow-[0_10px_30px_rgba(244,132,95,0.12)]' : 'bg-white/45 border-white/60 hover:bg-white/75'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f7498]">
                        {shelf.type === 'team' ? 'Team' : 'Personal'}
                      </span>
                      <span className="text-[11px] theme-muted">
                        {shelf.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-[#20314d] truncate">{shelf.name}</h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs theme-muted">{isCurrent ? 'Currently open' : 'Open this shelf'}</p>
                      {isShelfOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteShelf(shelf._id, shelf.name);
                          }}
                          title="Delete shelf"
                          aria-label="Delete shelf"
                          className="text-[#cc3d3d] hover:text-[#a92828] transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {showShare && <ShareShelfModal shelfId={shelfId} onClose={() => setShowShare(false)} />}
      {showManageMembers && <ManageMembersModal shelfId={shelfId} onClose={() => setShowManageMembers(false)} />}
    </Layout>
  );
}