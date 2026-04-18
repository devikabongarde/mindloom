import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Search, UserCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const shelfState = user?.defaultShelfId ? 'Active shelf ready' : 'Set up your default shelf';

  return (
    <Layout>
      <div className="flex flex-col gap-6 min-h-[60vh]">
        <div className="flex flex-wrap gap-3 items-center justify-center lg:justify-start">
          <span className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold">Mindfulness</span>
          <Link to="/shelf" className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform">Focus</Link>
          <Link to="/compost" className="theme-button-secondary inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold hover:-translate-y-0.5 transition-transform">Relaxation</Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] auto-rows-min">
            <section className="theme-card rounded-[32px] p-6 md:p-8 min-h-[220px] flex flex-col justify-between lg:col-span-2">
              <div className="theme-card-content max-w-3xl">
                <p className="theme-subtle-label font-semibold mb-3">General</p>
                <h1 className="theme-hero-title text-4xl md:text-5xl font-bold leading-tight max-w-2xl">
                  Good morning, {firstName}. What’s on your shelf?
                </h1>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/shelf" className="theme-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold">
                  Open shelf
                </Link>
                <Link to="/profile" className="theme-button-secondary inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold">
                  View profile
                </Link>
              </div>
            </section>

            <section className="theme-card rounded-[32px] p-6 min-h-[180px] flex flex-col justify-between">
              <div className="theme-card-content space-y-2">
                <p className="theme-subtle-label font-semibold">Meditate</p>
                <h2 className="text-2xl font-bold text-[#20314d]">Capture and curate</h2>
                <p className="theme-muted text-sm leading-relaxed">Drop links into your shelf and let ShelfLife organize them into a living archive.</p>
              </div>
              <Link to="/shelf" className="mt-5 text-sm font-semibold text-[#F4845F] hover:underline">Go to shelf →</Link>
            </section>

            <section className="theme-card rounded-[32px] p-6 min-h-[180px] flex flex-col justify-between">
              <div className="theme-card-content space-y-2">
                <p className="theme-subtle-label font-semibold">Music</p>
                <h2 className="text-2xl font-bold text-[#20314d]">Recent activity</h2>
                <p className="theme-muted text-sm leading-relaxed">The same soft-glass surface now frames your shelf, compost, and profile actions.</p>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] opacity-90" />
                <div>
                  <p className="text-sm font-semibold text-[#20314d]">{shelfState}</p>
                  <p className="text-xs theme-muted">{user?.defaultShelfId ? 'Ready for new links' : 'Choose a default shelf in your setup flow'}</p>
                </div>
              </div>
            </section>

            <section className="theme-card rounded-[32px] p-6 min-h-[210px] flex flex-col justify-between lg:col-span-2">
              <div className="theme-card-content grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="theme-subtle-label font-semibold mb-2">Move</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#20314d]">Your shelf is active and your archive is alive.</h2>
                  <p className="theme-muted text-sm md:text-base mt-3 leading-relaxed max-w-2xl">This area can hold the same short-form guidance, search, or quick shortcuts from the reference layout without changing any backend behavior.</p>
                </div>
                <div className="w-full md:w-[260px]">
                  <div className="theme-panel rounded-[28px] p-4">
                    <div className="theme-panel-content flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ffd8c8] via-[#f7b8d7] to-[#b7e7ff]" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#20314d]">Ease into shelf mode</p>
                        <p className="text-xs theme-muted">Mindful organization · 5 min</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/80 border border-white/70 flex items-center justify-center text-[#F4845F]">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="grid gap-6 auto-rows-min">
            <div className="theme-card rounded-[28px] p-4 flex items-center gap-3">
              <div className="theme-panel rounded-full flex-1 flex items-center gap-3 px-4 py-2.5">
                <Search size={16} className="theme-muted flex-shrink-0" />
                <span className="text-sm theme-muted">Search…</span>
              </div>
              <button className="w-11 h-11 rounded-full bg-white/70 border border-white/70 flex items-center justify-center text-[#20314d]">
                <Bell size={18} />
              </button>
              <button className="w-11 h-11 rounded-full bg-white/70 border border-white/70 flex items-center justify-center text-[#20314d]">
                <UserCircle2 size={18} />
              </button>
            </div>

            <div className="theme-card rounded-[28px] p-5">
              <div className="theme-card-content space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4845F] to-[#E8617A] flex items-center justify-center text-white shadow-lg shadow-[#F4845F]/30">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#20314d]">{user?.defaultShelfId ? 'Shelf ready' : 'Shelf setup needed'}</p>
                    <p className="text-xs theme-muted">{user?.defaultShelfId ? 'Your default shelf is connected.' : 'Pick a shelf to unlock this view.'}</p>
                  </div>
                </div>

                <div className="theme-panel rounded-[24px] p-4">
                  <p className="theme-subtle-label font-semibold mb-1">Now</p>
                  <p className="theme-muted text-sm leading-relaxed">Open the shelf, inspect compost, or review your profile. All interactions keep working as before.</p>
                </div>
              </div>
            </div>

            <div className="theme-card rounded-[28px] p-5">
              <div className="theme-card-content space-y-4">
                <p className="theme-subtle-label font-semibold">Ask anything…</p>
                <div className="theme-panel rounded-full flex items-center gap-3 px-4 py-3">
                  <span className="theme-muted text-sm flex-1">Type a shortcut or jump route</span>
                  <div className="w-8 h-8 rounded-full bg-white/80 border border-white/70 flex items-center justify-center text-[#F4845F]">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
