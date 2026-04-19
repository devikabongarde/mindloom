import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Send, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getSocket } from '../utils/socket';

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadByFriend, setUnreadByFriend] = useState({});
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api.get('/api/social/friends')
      .then(({ data }) => {
        if (cancelled) return;
        setFriends(Array.isArray(data?.friends) ? data.friends : []);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadUnreadSummary = async () => {
    try {
      const { data } = await api.get('/api/chat/unread-summary');
      setUnreadByFriend(data?.byFriend && typeof data.byFriend === 'object' ? data.byFriend : {});
      setUnreadTotal(Number(data?.total || 0));
    } catch {
      setUnreadByFriend({});
      setUnreadTotal(0);
    }
  };

  useEffect(() => {
    loadUnreadSummary();
    const intervalId = window.setInterval(loadUnreadSummary, 30_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const selectedFriend = useMemo(
    () => friends.find((friend) => String(friend._id) === String(selectedFriendId)) || null,
    [friends, selectedFriendId]
  );

  useEffect(() => {
    const selectedFromUrl = searchParams.get('chat') || '';
    if (selectedFromUrl && friends.some((friend) => String(friend._id) === String(selectedFromUrl))) {
      setSelectedFriendId(String(selectedFromUrl));
      return;
    }

    if (!selectedFriendId && friends.length > 0) {
      setSelectedFriendId(String(friends[0]._id));
    }
  }, [friends, searchParams, selectedFriendId]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedFriendId) {
      setChatMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    api.get(`/api/chat/${selectedFriendId}/messages`, { params: { limit: 120 } })
      .then(({ data }) => {
        if (cancelled) return;
        setChatMessages(Array.isArray(data?.messages) ? data.messages : []);
      })
      .catch(() => {
        if (!cancelled) setChatMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    api.patch(`/api/chat/${selectedFriendId}/read`)
      .then(({ data }) => {
        if (cancelled) return;
        setUnreadByFriend(data?.byFriend && typeof data.byFriend === 'object' ? data.byFriend : {});
        setUnreadTotal(Number(data?.total || 0));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedFriendId]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    if (!s.connected) s.connect();

    const myUserId = String(user?._id || user?.id || '');
    const activeFriendId = String(selectedFriendId || '');

    const handleIncomingMessage = (message) => {
      const sender = String(message?.senderId || '');
      const recipient = String(message?.recipientId || '');
      const mine = String(myUserId || '');

      if (recipient === mine) {
        if (activeFriendId && sender === activeFriendId) {
          api.patch(`/api/chat/${activeFriendId}/read`)
            .then(({ data }) => {
              setUnreadByFriend(data?.byFriend && typeof data.byFriend === 'object' ? data.byFriend : {});
              setUnreadTotal(Number(data?.total || 0));
            })
            .catch(() => {});
        } else if (sender) {
          setUnreadByFriend((prev) => ({
            ...prev,
            [sender]: Number(prev[sender] || 0) + 1,
          }));
          setUnreadTotal((prev) => prev + 1);
        }
      }

      const sameConversation =
        activeFriendId &&
        [sender, recipient].includes(mine) &&
        [sender, recipient].includes(activeFriendId);

      if (!sameConversation) return;

      setChatMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(message._id));
        return exists ? prev : [...prev, message];
      });
    };

    const handleUnreadUpdate = (summary) => {
      setUnreadByFriend(summary?.byFriend && typeof summary.byFriend === 'object' ? summary.byFriend : {});
      setUnreadTotal(Number(summary?.total || 0));
    };

    s.on('chat:message:new', handleIncomingMessage);
    s.on('chat:unread:update', handleUnreadUpdate);

    return () => {
      s.off('chat:message:new', handleIncomingMessage);
      s.off('chat:unread:update', handleUnreadUpdate);
    };
  }, [selectedFriendId, user?._id, user?.id]);

  const openChat = (friendId) => {
    setSelectedFriendId(String(friendId));
    navigate(`/chat?chat=${encodeURIComponent(String(friendId))}`, { replace: true });
  };

  const handleSendChat = async () => {
    const text = chatDraft.trim();
    if (!text || !selectedFriendId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const { data } = await api.post(`/api/chat/${selectedFriendId}/messages`, { text });
      setChatMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(data?._id));
        return exists ? prev : [...prev, data];
      });
      setChatDraft('');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 min-h-[60vh]">
        <section className="theme-card rounded-[28px] p-6">
          <div className="theme-card-content flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="theme-subtle-label font-semibold">Chat</p>
              <h1 className="theme-hero-title text-3xl md:text-4xl font-bold">Talk with your friends</h1>
              <p className="theme-muted mt-2 max-w-2xl">Realtime chat synced through your account.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f7498] bg-white/70 border border-white/70 rounded-full px-3 py-1">
              <Users size={13} />
              {friends.length} · {unreadTotal} new
            </span>
          </div>
        </section>

        <section className="theme-card rounded-[28px] p-5 md:p-6">
          <div className="theme-card-content">
            {loadingFriends ? (
              <p className="text-sm theme-muted">Loading friends...</p>
            ) : friends.length === 0 ? (
              <div className="rounded-2xl bg-white/55 border border-white/70 p-4">
                <p className="text-sm theme-muted">Add a friend first, then start chatting here.</p>
                <RouterLink to="/discover" className="theme-link text-xs font-semibold mt-2 inline-block">
                  Go to Discover
                </RouterLink>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
                <div className="rounded-2xl bg-white/55 border border-white/70 p-3 flex flex-col gap-2">
                  {friends.map((friend) => {
                    const isActive = String(friend._id) === String(selectedFriendId);
                    const unreadForFriend = Number(unreadByFriend[String(friend._id)] || 0);
                    return (
                      <button
                        key={friend._id}
                        onClick={() => openChat(friend._id)}
                        className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold border transition ${isActive ? 'bg-[#20314d] text-white border-[#20314d]' : 'bg-white/75 text-[#20314d] border-white/80 hover:bg-white'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate">{friend.name}</p>
                          {unreadForFriend > 0 && (
                            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${isActive ? 'bg-white text-[#20314d]' : 'bg-[#F4845F] text-white'}`}>
                              {unreadForFriend > 99 ? '99+' : unreadForFriend}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'theme-muted'}`}>{friend.email}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-white/70 border border-white/70 p-3 flex flex-col gap-3 min-h-[380px]">
                  {selectedFriend ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#20314d]">Chatting with {selectedFriend.name}</p>
                          <p className="text-[11px] theme-muted">Messages are saved and synced.</p>
                        </div>
                        <button
                          onClick={() => navigate(`/profile/${selectedFriend._id}`)}
                          className="text-xs font-semibold text-[#F4845F] hover:underline"
                        >
                          View profile
                        </button>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto flex flex-col gap-2 pr-1 flex-1">
                        {loadingMessages ? (
                          <div className="rounded-xl bg-white/60 border border-white/70 p-3">
                            <p className="text-sm theme-muted">Loading conversation...</p>
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="rounded-xl bg-white/60 border border-white/70 p-3">
                            <p className="text-sm font-semibold text-[#20314d]">Say hi</p>
                            <p className="text-xs theme-muted mt-1">Start a conversation about a shelf, a link, or anything fun.</p>
                          </div>
                        ) : (
                          chatMessages.map((message) => {
                            const mine = String(message.senderId) === String(user?._id || user?.id || 'me');
                            return (
                              <div key={message._id} className={`max-w-[86%] rounded-2xl px-3 py-2 ${mine ? 'ml-auto bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white' : 'bg-white/80 text-[#20314d] border border-white/70'}`}>
                                <p className={`text-[11px] font-semibold ${mine ? 'text-white/85' : 'theme-muted'}`}>{mine ? 'You' : selectedFriend.name}</p>
                                <p className="text-sm leading-relaxed break-words">{message.text}</p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          value={chatDraft}
                          onChange={(e) => setChatDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendChat();
                            }
                          }}
                          placeholder={`Message ${selectedFriend.name}...`}
                          className="flex-1 rounded-xl bg-white/85 border border-white/80 px-3 py-2 text-sm text-[#20314d] placeholder:text-[#8aa0c1] outline-none"
                        />
                        <button
                          onClick={handleSendChat}
                          disabled={!chatDraft.trim() || sendingMessage}
                          className="theme-button rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-70"
                        >
                          <Send size={14} />
                          {sendingMessage ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm theme-muted">
                      <span className="inline-flex items-center gap-2">
                        <MessageCircle size={16} />
                        Select a friend to start chatting.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
