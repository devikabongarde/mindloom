import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VIBE_COLORS = {
  Educational:   'bg-blue-100 text-blue-700',
  HighSignal:    'bg-green-100 text-green-700',
  Chaotic:       'bg-orange-100 text-orange-700',
  Cursed:        'bg-purple-100 text-purple-700',
  Inspirational: 'bg-pink-100 text-pink-700',
};

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const archetype = user.curatorArchetype || { name: 'Fresh Soul', description: 'You just started curating.' };
  const stats = user.vibeStats || {};
  const initial = user.name?.charAt(0).toUpperCase() || '?';

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-3xl">
        <h1 className="theme-hero-title text-3xl font-bold">Curator Profile</h1>

        <div className="theme-card rounded-[24px] p-6 shadow-xl flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-20 h-20 rounded-[16px] bg-gradient-to-br from-[#F4845F] to-[#E8617A] flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
            {initial}
          </div>

          <div className="theme-card-content flex-1">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm theme-muted">{user.email}</p>
            <div className="mt-4">
              <p className="theme-subtle-label font-semibold mb-1">
                Archetype
              </p>
              <p className="text-lg font-bold">{archetype.name}</p>
              <p className="text-sm theme-muted mt-1 leading-relaxed">{archetype.description}</p>
            </div>
          </div>
        </div>

        <div className="theme-panel rounded-[24px] p-6 shadow-lg">
          <p className="theme-card-content text-sm font-semibold mb-4">Your vibe distribution</p>
          {Object.values(stats).every((v) => v === 0) ? (
            <p className="text-xs theme-muted">Save a few links first to see your vibe breakdown.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded-2xl px-4 py-2 flex items-center gap-2 border border-white/60 shadow-sm ${VIBE_COLORS[key] || 'bg-white/60 text-gray-700'}`}
                >
                  <span className="text-xs font-medium">{key}</span>
                  <span className="text-sm font-bold">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
