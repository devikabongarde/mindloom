import { UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      aria-label={user?.name ? `Open profile for ${user.name}` : 'Open profile'}
      className="fixed right-6 top-8 z-[20] w-11 h-11 rounded-full bg-white/70 border border-white/80 shadow-[0_12px_28px_rgba(120,141,183,0.16)] backdrop-blur-xl flex items-center justify-center text-[#20314d] hover:scale-105 transition-transform"
    >
      <UserCircle2 size={22} />
    </button>
  );
}
