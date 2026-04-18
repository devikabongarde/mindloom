import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import VibePills from '../components/VibePills';
import api from '../utils/api';

export default function CompostHeap() {
  const { user } = useAuth();
  const [dead, setDead] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.defaultShelfId) return;
    api.get(`/api/links/compost/${user.defaultShelfId}`)
      .then(({ data }) => setDead(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleRevive = async (link) => {
    await api.post(`/api/links/${link._id}/click`);
    setDead((prev) => prev.filter((l) => l._id !== link._id));
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <h1 className="theme-hero-title text-3xl font-bold">☠ Compost Heap</h1>
          <span className="text-sm theme-muted bg-white/50 border border-white/60 rounded-full px-4 py-1.5 backdrop-blur">
            {dead.length} link{dead.length !== 1 ? 's' : ''} rotting
          </span>
        </div>

        <p className="theme-muted text-sm max-w-xl leading-relaxed">
          These links were neglected for too long and have decomposed.
          Click <strong>Revive</strong> to pull one back from the dead — or let them rot forever.
        </p>

        {loading ? (
          <p className="theme-muted text-center mt-12">Digging through the compost…</p>
        ) : dead.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-5xl mb-4">🌱</p>
            <p className="theme-muted font-medium">Nothing rotting here. Your shelf is alive!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dead.map((link) => (
              <div
                key={link._id}
                className="theme-card rounded-[20px] p-5 flex flex-col gap-3 opacity-40 grayscale hover:opacity-60 transition-all duration-300"
              >
                <h3 className="theme-card-content font-bold text-base line-clamp-2">
                  {link.title}
                </h3>
                <p className="theme-muted text-sm line-clamp-2">
                  {link.summary}
                </p>
                <VibePills vibes={link.vibes} />
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/30">
                  <span className="text-xs theme-muted italic">
                    Idle {link.minutesIdle}m · {link.addedBy?.name || 'Unknown'}
                  </span>
                  <button
                    onClick={() => handleRevive(link)}
                    className="text-xs font-semibold text-[#F4845F] hover:underline"
                  >
                    ⚡ Revive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
