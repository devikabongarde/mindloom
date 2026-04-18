import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, GitFork, Star, UserPlus } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

function iconFor(type) {
  if (type === 'friend_request') return UserPlus;
  if (type === 'friend_accept') return Check;
  if (type === 'shelf_starred') return Star;
  if (type === 'shelf_forked') return GitFork;
  return Bell;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/social/notifications', { params: { limit: 80 } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch {
      setNotifications([]);
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
            ) : notifications.length === 0 ? (
              <p className="theme-muted text-sm">No notifications yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((notification) => {
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
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
