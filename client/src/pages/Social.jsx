import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, GitFork, Plus, Star, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export default function Social() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfPublic, setNewShelfPublic] = useState(true);
  const [createShelfLoading, setCreateShelfLoading] = useState(false);

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);

  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [shelfQuery, setShelfQuery] = useState('');
  const [shelfSearchLoading, setShelfSearchLoading] = useState(false);
  const [shelfSearchResults, setShelfSearchResults] = useState([]);
  const [openDiscussionByShelfId, setOpenDiscussionByShelfId] = useState({});
  const [commentsByShelfId, setCommentsByShelfId] = useState({});
  const [commentTextByShelfId, setCommentTextByShelfId] = useState({});
  const [commentLoadingByShelfId, setCommentLoadingByShelfId] = useState({});

  useEffect(() => {
    const friendIdFromQuery = String(searchParams.get('chat') || '').trim();
    if (!friendIdFromQuery) return;
    navigate(`/chat?chat=${encodeURIComponent(friendIdFromQuery)}`, { replace: true });
  }, [navigate, searchParams]);

  const refreshFriends = async () => {
    const { data } = await api.get('/api/social/friends');
    setFriends(data.friends || []);
    setIncoming(data.received || []);
    setSent(data.sent || []);
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get('/api/social/feed', { params: { limit: 18 } }),
      api.get('/api/social/friends'),
      api.get('/api/social/users'),
    ])
      .then(([feedRes, friendsRes, usersRes]) => {
        if (cancelled) return;
        setFeed(sortShelves(feedRes.data || []));
        setFriends(friendsRes.data.friends || []);
        setIncoming(friendsRes.data.received || []);
        setSent(friendsRes.data.sent || []);
        setDiscoverUsers(usersRes.data || []);
      })
      .catch(() => {
        if (cancelled) return;
        setFeed([]);
        setDiscoverUsers([]);
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDiscoverLoading(true);

    const timer = window.setTimeout(() => {
      api.get('/api/social/users', { params: { q: discoverQuery } })
        .then(({ data }) => {
          if (!cancelled) setDiscoverUsers(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setDiscoverUsers([]);
        })
        .finally(() => {
          if (!cancelled) setDiscoverLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [discoverQuery]);

  const friendIdSet = useMemo(() => new Set(friends.map((f) => String(f._id))), [friends]);
  const incomingIdSet = useMemo(() => new Set(incoming.map((u) => String(u._id))), [incoming]);
  const sentIdSet = useMemo(() => new Set(sent.map((u) => String(u._id))), [sent]);
  const visibleFeed = shelfQuery.trim() ? shelfSearchResults : feed;

  useEffect(() => {
    const query = shelfQuery.trim();
    if (!query) {
      setShelfSearchResults([]);
      setShelfSearchLoading(false);
      return;
    }

    let cancelled = false;
    setShelfSearchLoading(true);

    const timer = window.setTimeout(() => {
      api.get('/api/social/search-shelves', { params: { q: query, limit: 18 } })
        .then(({ data }) => {
          if (!cancelled) setShelfSearchResults(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setShelfSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setShelfSearchLoading(false);
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shelfQuery]);

  const handleRequest = async (userId) => {
    await api.post('/api/social/friends/request', { userId });
    await refreshFriends();
  };

  const handleAccept = async (userId) => {
    await api.post('/api/social/friends/accept', { userId });
    await refreshFriends();
  };

  const handleRemove = async (userId) => {
    await api.post('/api/social/friends/remove', { userId });
    await refreshFriends();
  };

  const sortShelves = (items) => [...items].sort((a, b) => {
    const starDelta = (b.starCount || 0) - (a.starCount || 0);
    if (starDelta !== 0) return starDelta;
    const reactionDelta = (b.totalReactions || 0) - (a.totalReactions || 0);
    if (reactionDelta !== 0) return reactionDelta;
    return new Date(b.latestActivityAt || 0) - new Date(a.latestActivityAt || 0);
  });

  const handleStarShelf = async (shelfId) => {
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
      setShelfSearchResults((prev) => prev.map((item) => (
        item._id !== shelfId
          ? item
          : { ...item, starCount: data.starCount, starredByMe: data.starred }
      )));
    } catch {
      alert('Could not update shelf star.');
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
      alert('Could not fork this shelf. You may not have access.');
    }
  };

  const loadShelfComments = async (shelfId) => {
    setCommentLoadingByShelfId((prev) => ({ ...prev, [shelfId]: true }));
    try {
      const { data } = await api.get(`/api/social/shelves/${shelfId}/comments`, { params: { limit: 40 } });
      setCommentsByShelfId((prev) => ({
        ...prev,
        [shelfId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      setCommentsByShelfId((prev) => ({ ...prev, [shelfId]: [] }));
    } finally {
      setCommentLoadingByShelfId((prev) => ({ ...prev, [shelfId]: false }));
    }
  };

  const toggleDiscussion = async (shelfId) => {
    const nextOpen = !openDiscussionByShelfId[shelfId];
    setOpenDiscussionByShelfId((prev) => ({ ...prev, [shelfId]: nextOpen }));

    if (nextOpen && !commentsByShelfId[shelfId]) {
      await loadShelfComments(shelfId);
    }
  };

  const handleAddComment = async (shelfId) => {
    const text = String(commentTextByShelfId[shelfId] || '').trim();
    if (!text) return;

    setCommentLoadingByShelfId((prev) => ({ ...prev, [shelfId]: true }));
    try {
      const { data } = await api.post(`/api/social/shelves/${shelfId}/comments`, { text });

      setCommentsByShelfId((prev) => ({
        ...prev,
        [shelfId]: [data, ...(prev[shelfId] || [])],
      }));
      setCommentTextByShelfId((prev) => ({ ...prev, [shelfId]: '' }));

      setFeed((prev) => prev.map((item) => (
        item._id === shelfId
          ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
          : item
      )));
      setShelfSearchResults((prev) => prev.map((item) => (
        item._id === shelfId
          ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
          : item
      )));
    } catch {
      alert('Could not post comment.');
    } finally {
      setCommentLoadingByShelfId((prev) => ({ ...prev, [shelfId]: false }));
    }
  };

  const actionFor = (user) => {
    const id = String(user._id);
    if (friendIdSet.has(id)) return { label: 'Friends', action: () => handleRemove(id), style: 'theme-button-secondary' };
    if (incomingIdSet.has(id)) return { label: 'Accept', action: () => handleAccept(id), style: 'theme-button' };
    if (sentIdSet.has(id)) return { label: 'Requested', action: null, style: 'theme-button-secondary' };
    return { label: 'Add Friend', action: () => handleRequest(id), style: 'theme-button' };
  };

  const handleCreateShelf = async () => {
    const name = newShelfName.trim();
    if (!name || createShelfLoading) return;

    try {
      setCreateShelfLoading(true);
      const { data } = await api.post('/api/shelves', {
        name,
        isPublic: newShelfPublic,
        weather: 'Foggy',
      });

      if (data?._id) {
        try {
          await api.patch('/api/auth/me', { defaultShelfId: data._id });
          const token = localStorage.getItem('mindloom_token');
          if (token && user) {
            login(token, { ...user, defaultShelfId: data._id });
          }
        } catch {
          // Non-fatal: shelf still exists even if default update fails.
        }
      }

      setNewShelfName('');
      setFeedLoading(true);

      const { data: refreshedFeed } = await api.get('/api/social/feed', { params: { limit: 18 } });
      setFeed(sortShelves(Array.isArray(refreshedFeed) ? refreshedFeed : []));

      if (data?._id) navigate(`/shelf/${data._id}`);
    } catch {
      // Keep UX simple: if creation fails, leave form values for retry.
    } finally {
      setCreateShelfLoading(false);
      setFeedLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 min-h-[60vh]">
        <section className="theme-card rounded-[28px] p-6">
          <div className="theme-card-content flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="theme-subtle-label font-semibold">Discover</p>
              <h1 className="theme-hero-title text-3xl md:text-4xl font-bold">Public shelves and people</h1>
              <p className="theme-muted mt-2 max-w-2xl">Explore popular public shelves, discover people, and build your network.</p>
            </div>
            <div className="theme-panel rounded-2xl px-4 py-3 min-w-[250px]">
              <p className="text-xs theme-muted uppercase tracking-[0.18em]">Create New Shelf</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="Shelf name"
                  className="flex-1 rounded-xl bg-white/70 border border-white/70 px-3 py-2 text-sm text-[#20314d] placeholder:text-[#8aa0c1] outline-none"
                />
                <button
                  onClick={handleCreateShelf}
                  disabled={createShelfLoading || !newShelfName.trim()}
                  title="Create shelf"
                  aria-label="Create shelf"
                  className="theme-button rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-70 inline-flex items-center justify-center"
                >
                  <Plus size={16} />
                </button>
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs theme-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newShelfPublic}
                  onChange={(e) => setNewShelfPublic(e.target.checked)}
                />
                Make shelf public
              </label>
              <p className="text-xs theme-muted mt-2">{friends.length} friends · {incoming.length} pending</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <section className="theme-card rounded-[28px] p-5 md:p-6">
            <div className="theme-card-content">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-[#20314d]">Public Popular Shelves</h2>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f7498]">Trending now</span>
              </div>

              <div className="theme-panel rounded-2xl px-4 py-3 mb-4">
                <input
                  value={shelfQuery}
                  onChange={(e) => setShelfQuery(e.target.value)}
                  placeholder="Search shelves by title, owner, or link..."
                  className="w-full bg-transparent outline-none text-sm text-[#20314d] placeholder:text-[#8aa0c1]"
                />
              </div>

              {feedLoading ? (
                <p className="theme-muted text-sm">Loading public feed…</p>
              ) : shelfSearchLoading ? (
                <p className="theme-muted text-sm">Searching public shelves by meaning…</p>
              ) : feed.length === 0 ? (
                <p className="theme-muted text-sm">No public shelves yet. Make a shelf public to appear in the social feed.</p>
              ) : visibleFeed.length === 0 ? (
                <p className="theme-muted text-sm">No shelves match your search.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleFeed.map((item, index) => (
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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleDiscussion(item._id)}
                            className="font-semibold text-[#5f7498]"
                          >
                            Discuss ({item.commentsCount || 0})
                          </button>
                          <button
                            onClick={() => handleStarShelf(item._id)}
                            title={item.starredByMe ? 'Unstar shelf' : 'Star shelf'}
                            aria-label={item.starredByMe ? 'Unstar shelf' : 'Star shelf'}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${item.starredByMe ? 'text-[#F4845F] border-[#F4845F]/25 bg-[#F4845F]/10' : 'text-[#5f7498] border-white/70 bg-white/60 hover:bg-white/90'}`}
                          >
                            <Star size={15} fill={item.starredByMe ? 'currentColor' : 'none'} />
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

                      {openDiscussionByShelfId[item._id] && (
                        <div className="mt-3 rounded-xl border border-white/70 bg-white/55 p-3">
                          {commentLoadingByShelfId[item._id] && !commentsByShelfId[item._id] ? (
                            <p className="text-xs theme-muted">Loading discussion…</p>
                          ) : (
                            <>
                              <div className="max-h-44 overflow-y-auto flex flex-col gap-2 pr-1">
                                {(commentsByShelfId[item._id] || []).length === 0 ? (
                                  <p className="text-xs theme-muted">Start the discussion for this shelf.</p>
                                ) : (
                                  (commentsByShelfId[item._id] || []).map((comment) => (
                                    <div key={comment._id} className="rounded-lg bg-white/70 border border-white/70 px-2.5 py-2">
                                      <p className="text-[11px] font-semibold text-[#20314d]">{comment.user?.name || 'Unknown'}</p>
                                      <p className="text-xs text-[#2b4265] mt-0.5 break-words">{comment.text}</p>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  value={commentTextByShelfId[item._id] || ''}
                                  onChange={(e) => setCommentTextByShelfId((prev) => ({ ...prev, [item._id]: e.target.value }))}
                                  placeholder="Add a comment..."
                                  className="flex-1 rounded-lg bg-white/80 border border-white/70 px-3 py-2 text-xs text-[#20314d] placeholder:text-[#8aa0c1] outline-none"
                                />
                                <button
                                  onClick={() => handleAddComment(item._id)}
                                  disabled={commentLoadingByShelfId[item._id] || !String(commentTextByShelfId[item._id] || '').trim()}
                                  className="theme-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-70"
                                >
                                  Send
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="theme-card rounded-[28px] p-5 md:p-6">
            <div className="theme-card-content flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#20314d]">Friends</h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f7498] bg-white/70 border border-white/70 rounded-full px-3 py-1">
                  <Users size={13} />
                  {friends.length}
                </span>
              </div>

              <div className="theme-panel rounded-2xl px-4 py-3">
                <input
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full bg-transparent outline-none text-sm text-[#20314d] placeholder:text-[#8aa0c1]"
                />
              </div>

              <div className="bg-white/45 rounded-2xl p-3 border border-white/60">
                <p className="theme-subtle-label font-semibold mb-2">Friend Requests</p>
                <p className="text-sm theme-muted">{incoming.length > 0 ? `${incoming.length} pending request(s).` : 'No pending requests right now.'}</p>
                <RouterLink to="/notifications" className="theme-link text-xs font-semibold mt-2 inline-block">
                  Open Notifications
                </RouterLink>
              </div>

              <div className="bg-white/45 rounded-2xl p-3 border border-white/60">
                <p className="theme-subtle-label font-semibold mb-2">Friend chat</p>
                <p className="text-sm theme-muted">Chat now lives in its own page for a cleaner experience.</p>
                <RouterLink to="/chat" className="theme-link text-xs font-semibold mt-2 inline-block">
                  Open Chat Page
                </RouterLink>
              </div>

              <div className="bg-white/45 rounded-2xl p-3 border border-white/60">
                <p className="theme-subtle-label font-semibold mb-2">Discover People</p>
                {discoverLoading ? (
                  <p className="theme-muted text-sm">Searching users...</p>
                ) : discoverUsers.length === 0 ? (
                  <p className="theme-muted text-sm">No users found.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                    {discoverUsers.map((u) => {
                      const action = actionFor(u);
                      return (
                        <div key={u._id} className="flex items-center justify-between gap-2 rounded-xl bg-white/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#20314d] truncate">{u.name}</p>
                            <p className="text-xs theme-muted truncate">{u.email}</p>
                          </div>
                          <button
                            disabled={!action.action}
                            onClick={action.action || undefined}
                            className={`${action.style} rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-70 disabled:cursor-default`}
                          >
                            {action.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
