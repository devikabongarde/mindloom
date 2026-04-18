import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock3, GitFork, Link2, MessageSquare, Star, UserPlus } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

function iconFor(type) {
  if (type === 'friend_request') return UserPlus;
  if (type === 'friend_accept') return Check;
  if (type === 'shelf_starred') return Star;
  if (type === 'shelf_forked') return GitFork;
  if (type === 'shelf_comment') return MessageSquare;
  if (type === 'link_comment') return MessageSquare;
  if (type === 'link_reference') return Link2;
  if (type === 'link_reacted') return Check;
  if (type === 'link_decay_warning') return Clock3;
  if (type === 'link_decay_reminder') return Clock3;
  return Bell;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [loadError, setLoadError] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const decayNotifications = useMemo(
    () => notifications.filter((n) => n.type === 'link_decay_warning' || n.type === 'link_decay_reminder'),
    [notifications]
  );

  const requestNotifications = useMemo(
    () => notifications.filter((n) => n.type === 'friend_request' || n.type === 'friend_accept'),
    [notifications]
  );

  const shelfNotifications = useMemo(
    () => notifications.filter((n) => ['shelf_starred', 'shelf_forked', 'shelf_comment'].includes(n.type)),
    [notifications]
  );

  const linkNotifications = useMemo(
    () => notifications.filter((n) => ['link_reacted', 'link_comment', 'link_reference'].includes(n.type)),
    [notifications]
  );

  const otherNotifications = useMemo(
    () => notifications.filter((n) => {
      const grouped = new Set([
        'friend_request',
        'friend_accept',
        'shelf_starred',
        'shelf_forked',
        'shelf_comment',
        'link_reacted',
        'link_comment',
        'link_reference',
        'link_decay_warning',
        'link_decay_reminder',
      ]);
      return !grouped.has(n.type);
    }),
    [notifications]
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const { data } = await api.get('/api/social/notifications', { params: { limit: 80 } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (err) {
      setNotifications([]);
      setLoadError(err?.response?.data?.message || 'Could not load notifications. Check server connection and login status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const isStoredNotification = (notification) => !notification.synthetic && !String(notification._id).startsWith('friend-request-');

  const markRead = async (notification) => {
    if (!isStoredNotification(notification) || notification.isRead) return;

    try {
      await api.patch(`/api/social/notifications/${notification._id}/read`);
      setNotifications((prev) => prev.map((n) => (
        String(n._id) === String(notification._id) ? { ...n, isRead: true } : n
      )));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/social/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silent
    }
  };

  const handleFriendAction = async (notification, action) => {
    const requesterId = notification?.meta?.requesterUserId || notification?.actorId?._id;
    if (!requesterId) return;

    try {
      setProcessingId(String(notification._id));
      if (action === 'accept') {
        await api.post('/api/social/friends/accept', { userId: requesterId });
      } else {
        await api.post('/api/social/friends/remove', { userId: requesterId });
      }

      if (isStoredNotification(notification)) {
        await api.patch(`/api/social/notifications/${notification._id}/read`);
      }

      await loadNotifications();
    } catch {
      // silent
    } finally {
      setProcessingId(null);
    }
  };

  const renderNotificationCard = (notification) => {
    const Icon = iconFor(notification.type);
    const actorName = notification?.actorId?.name || 'Someone';

    return (
      <div
        key={notification._id}
        className={`rounded-2xl border p-4 ${notification.isRead ? 'bg-white/40 border-white/60' : 'bg-white/70 border-white/80'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/80 border border-white/70 flex items-center justify-center text-[#5f7498] flex-shrink-0">
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#20314d]">{notification.title || 'Notification'}</p>
              <p className="text-xs theme-muted mt-0.5">{notification.message || `${actorName} sent an update`}</p>
              <p className="text-[11px] theme-muted mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {notification.type === 'friend_request' ? (
              <>
                <button
                  onClick={() => handleFriendAction(notification, 'accept')}
                  disabled={processingId === String(notification._id)}
                  className="theme-button rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-70"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleFriendAction(notification, 'decline')}
                  disabled={processingId === String(notification._id)}
                  className="theme-button-secondary rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-70"
                >
                  Decline
                </button>
              </>
            ) : (
              <>
                {notification.type === 'shelf_forked' && notification.meta?.sourceShelfId && (
                  <Link to={`/shelf/${notification.meta.sourceShelfId}`} className="theme-link text-xs font-semibold">
                    Open shelf
                  </Link>
                )}
                {(notification.type === 'link_decay_warning' || notification.type === 'link_decay_reminder') && (
                  <Link to="/compost" className="theme-link text-xs font-semibold">
                    Open compost
                  </Link>
                )}
                {!notification.isRead && isStoredNotification(notification) && (
                  <button
                    onClick={() => markRead(notification)}
                    className="theme-button-secondary rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    Mark read
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (label, title, items) => {
    if (items.length === 0) return null;

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="theme-subtle-label font-semibold">{label}</p>
            <h2 className="text-lg font-bold text-[#20314d]">{title}</h2>
          </div>
          <span className="text-xs font-semibold text-[#5f7498] bg-white/60 border border-white/70 rounded-full px-3 py-1">
            {items.length}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {items.map(renderNotificationCard)}
        </div>
      </section>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 min-h-[60vh]">
        <section className="theme-card rounded-[28px] p-6">
          <div className="theme-card-content flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="theme-subtle-label font-semibold">Updates</p>
              <h1 className="theme-hero-title text-3xl md:text-4xl font-bold">Notifications</h1>
              <p className="theme-muted mt-2 max-w-2xl">Friend requests and activity updates show up here.</p>
            </div>
            <div className="theme-panel rounded-2xl px-4 py-3 min-w-[220px]">
              <p className="text-xs theme-muted uppercase tracking-[0.18em]">Unread</p>
              <p className="text-2xl font-bold text-[#20314d] mt-1">{unreadCount}</p>
              <button
                onClick={markAllRead}
                className="theme-button-secondary rounded-full px-3 py-1.5 text-xs font-semibold mt-2 inline-flex items-center gap-1.5"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </div>
          </div>
        </section>

        <section className="theme-card rounded-[28px] p-5 md:p-6">
          <div className="theme-card-content">
            {loading ? (
              <p className="theme-muted text-sm">Loading notifications…</p>
            ) : loadError ? (
              <div className="bg-[#fff5f3] border border-[#f9c9bf] rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#8c3a2b]">Notifications unavailable</p>
                <p className="text-xs text-[#8c3a2b]/90 mt-1">{loadError}</p>
                <button
                  onClick={loadNotifications}
                  className="theme-button-secondary rounded-full px-3 py-1.5 text-xs font-semibold mt-3"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="theme-muted text-sm">No notifications yet.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {renderSection('Requests', 'Friend requests and responses', requestNotifications)}
                {renderSection('Shelf', 'Stars, forks, and comments', shelfNotifications)}
                {renderSection('Links', 'Reactions and link notes', linkNotifications)}
                {renderSection('Compost', 'Decay reminders', decayNotifications)}
                {renderSection('Other', 'Everything else', otherNotifications)}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
