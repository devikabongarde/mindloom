import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Trash2, User, Bell, LogOut, Network, Compass, MessageCircle, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getSocket } from '../utils/socket';

const navItems = [
  { to: '/dashboard',       icon: Home,           label: 'Dashboard'      },
  { to: '/shelf',           icon: BookOpen,       label: 'My Shelf'       },
  // { to: '/discover',        icon: Compass,        label: 'Discover'       },
  // { to: '/study',           icon: GraduationCap,  label: 'Study Mode'     },
  { to: '/discover',        icon: Compass,        label: 'Discover'       },
  { to: '/chat',            icon: MessageCircle,  label: 'Chat'           },
  { to: '/knowledge-graph', icon: Network,        label: 'Knowledge Graph'},
  { to: '/compost',         icon: Trash2,         label: 'Compost Heap'   },
];

const utilityItems = [
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ isCollapsed = false, onToggleCollapse = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadBadgeCounts = async () => {
      try {
        const [notificationsRes, chatRes] = await Promise.all([
          api.get('/api/social/notifications', { params: { limit: 20 } }),
          api.get('/api/chat/unread-summary'),
        ]);
        if (!cancelled) {
          setUnreadCount(Number(notificationsRes?.data?.unreadCount || 0));
          setChatUnreadCount(Number(chatRes?.data?.total || 0));
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
          setChatUnreadCount(0);
        }
      }
    };

    loadBadgeCounts();
    const intervalId = window.setInterval(loadBadgeCounts, 30_000);

    const s = getSocket();
    const myUserId = String(user?._id || user?.id || '');
    const handleChatMessage = (message) => {
      const recipient = String(message?.recipientId || '');
      if (!myUserId || recipient !== myUserId) return;
      loadBadgeCounts();
    };
    const handleUnreadUpdate = (summary) => {
      if (cancelled) return;
      setChatUnreadCount(Number(summary?.total || 0));
    };
    if (s) {
      if (!s.connected) s.connect();
      s.on('chat:message:new', handleChatMessage);
      s.on('chat:unread:update', handleUnreadUpdate);
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (s) {
        s.off('chat:message:new', handleChatMessage);
        s.off('chat:unread:update', handleUnreadUpdate);
      }
    };
  }, [user?._id, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`fixed left-0 top-0 h-full z-10 p-4 transition-[width] duration-300 ${isCollapsed ? 'w-[92px]' : 'w-[260px]'}`}>
      <div className={`theme-card relative h-full rounded-[32px] p-5 flex flex-col transition-all duration-300 ${isCollapsed ? 'px-3' : ''}`}>
        <button
          type="button"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
          className="absolute top-4 right-4 z-10 rounded-xl p-2 text-[#5f7498] hover:bg-white/45 hover:text-[#20314d] transition-colors"
        >
          {isCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </button>

        <div className={`theme-card-content flex items-center pb-5 border-b border-white/60 ${isCollapsed ? 'justify-center pt-6' : 'gap-3 pr-10'}`}>
          <img
            src="/logoo.png"
            alt="ShelfLife logo"
            className="w-11 h-11 rounded-full object-cover shadow-sm shadow-slate-400/30 flex-shrink-0"
          />
          {!isCollapsed && (
            <div>
              <span className="font-bold text-lg bg-gradient-to-r from-[#F4845F] to-[#E8617A] bg-clip-text text-transparent tracking-tight font-['Sora'] block leading-none">
                SHELFLIFE
              </span>
              <p className="theme-muted text-xs mt-1">Living archive</p>
            </div>
          )}
        </div>

        <nav className={`flex flex-col gap-1 py-5 flex-1 ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed && <p className="theme-subtle-label font-semibold mb-2 px-3">General</p>}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `relative flex items-center rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/72 text-[#20314d] shadow-sm border border-white/70'
                    : 'text-[#5f7498] hover:bg-white/45 hover:text-[#f4845f]'
                } ${isCollapsed ? 'justify-center w-11 h-11 px-0 py-0' : 'gap-3 px-4 py-3'}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span className="flex-1">{label}</span>}
              {to === '/notifications' && unreadCount > 0 && (
                isCollapsed ? (
                  <span className="absolute right-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-[#F4845F] border border-white/80" aria-hidden="true" />
                ) : (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#F4845F] text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )
              )}
              {to === '/chat' && chatUnreadCount > 0 && (
                <span className={`absolute rounded-full bg-[#F4845F] border border-white/80 ${isCollapsed ? 'right-1.5 top-1.5 w-2.5 h-2.5' : 'right-3 top-3 w-2 h-2'}`} aria-hidden="true" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-auto flex flex-col gap-1 pb-4 ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed && <p className="theme-subtle-label font-semibold mb-2 px-3">Account</p>}
          {utilityItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `relative flex items-center rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/72 text-[#20314d] shadow-sm border border-white/70'
                    : 'text-[#5f7498] hover:bg-white/45 hover:text-[#f4845f]'
                } ${isCollapsed ? 'justify-center w-11 h-11 px-0 py-0' : 'gap-3 px-4 py-3'}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span className="flex-1">{label}</span>}
              {to === '/notifications' && unreadCount > 0 && (
                isCollapsed ? (
                  <span className="absolute right-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-[#F4845F] border border-white/80" aria-hidden="true" />
                ) : (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#F4845F] text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )
              )}
            </NavLink>
          ))}
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center rounded-2xl text-sm font-medium text-[#5f7498] hover:bg-white/50 hover:text-[#e8617a] transition-colors ${isCollapsed ? 'justify-center w-11 h-11 self-center px-0 py-0' : 'gap-3 px-4 py-3 w-full'}`}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
}
