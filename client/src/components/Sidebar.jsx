import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Trash2, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: Home,     label: 'Dashboard'    },
  { to: '/shelf',     icon: BookOpen, label: 'My Shelf'     },
  { to: '/compost',   icon: Trash2,   label: 'Compost Heap' },
  { to: '/profile',   icon: User,     label: 'Profile'      },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] z-10 p-4">
      <div className="theme-card h-full rounded-[32px] p-5 flex flex-col">
        <div className="theme-card-content flex items-center gap-3 pb-5 border-b border-white/60">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] shadow-lg shadow-[#F4845F]/30 flex-shrink-0" />
          <div>
            <span className="font-bold text-lg bg-gradient-to-r from-[#F4845F] to-[#E8617A] bg-clip-text text-transparent tracking-tight font-['Sora'] block leading-none">
              SHELFLIFE
            </span>
            <p className="theme-muted text-xs mt-1">Living archive</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 py-5 flex-1">
          <p className="theme-subtle-label font-semibold mb-2 px-3">General</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/72 text-[#20314d] shadow-sm border border-white/70'
                    : 'text-[#5f7498] hover:bg-white/45 hover:text-[#f4845f]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="theme-panel rounded-[28px] p-4 mb-4">
          <div className="theme-panel-content space-y-3">
            <p className="theme-subtle-label font-semibold">Others</p>
            <div className="flex items-center gap-3 text-sm theme-muted"><User size={16} /> Profile</div>
            <div className="flex items-center gap-3 text-sm theme-muted"><BookOpen size={16} /> Shelves</div>
            <div className="flex items-center gap-3 text-sm theme-muted"><Trash2 size={16} /> Compost</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#5f7498] hover:bg-white/50 hover:text-[#e8617a] transition-colors w-full"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
