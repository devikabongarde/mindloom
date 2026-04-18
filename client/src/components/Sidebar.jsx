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
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-white shadow-[4px_0_24px_rgba(26,26,46,0.06)] flex flex-col z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] shadow-lg shadow-[#F4845F]/40 flex-shrink-0" />
        <span className="font-bold text-lg bg-gradient-to-r from-[#F4845F] to-[#E8617A] bg-clip-text text-transparent tracking-tight">
          SHELFLIFE
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#F4845F]/10 text-[#F4845F]'
                  : 'text-[#6B7280] hover:bg-[#F4845F]/10 hover:text-[#F4845F]'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-red-50 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
