import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="flex items-center justify-end gap-4 px-6 py-4">
      <button className="relative text-[#6B7280] hover:text-[#1A1A2E] transition-colors">
        <Bell size={20} />
      </button>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] flex items-center justify-center text-white text-sm font-bold shadow-md">
        {initials}
      </div>
    </header>
  );
}
