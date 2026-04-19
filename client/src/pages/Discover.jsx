import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import VibePills from '../components/VibePills';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Discover() {
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user }  = useAuth();

  useEffect(() => {
    api.get('/api/shelves/discover')
      .then(({ data }) => setShelves(data))
      .finally(() => setLoading(false));
  }, []);

  const handleFork = async (shelf) => {
    const name = window.prompt(
      `Fork "${shelf.name}"?\nName your copy:`,
      `${shelf.name} (fork)`
    );
    if (!name) return;
    try {
      const { data } = await api.post('/api/shelves/fork', {
        sourceShelfId: shelf._id,
        newName: name,
      });
      navigate(`/shelf/${data._id}`);
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not fork shelf. Try again.');
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A2E]">
            🌍 Discover Public Shelves
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Browse what others are archiving. Fork anything interesting.
          </p>
        </div>

        {loading ? (
          <p className="text-[#6B7280] text-center mt-12">
            Browsing the collective archive...
          </p>
        ) : shelves.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-5xl mb-4">🌱</p>
            <p className="text-[#6B7280]">
              No public shelves yet. Be the first to publish yours!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shelves.map((shelf) => {
              const ownerId   = shelf.ownerId?._id || shelf.ownerId;
              const isMyShelf = String(ownerId) === String(user?._id || user?.id || '');

              return (
                <div key={shelf._id}
                  className="rounded-2xl p-5 flex flex-col gap-3 bg-white/45 backdrop-blur-xl border border-white/60 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-[#1A1A2E] text-lg line-clamp-1">
                        {shelf.name}
                      </h2>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        by {shelf.ownerName} · {shelf.linkCount} links
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-[#6B7280] bg-white/70 rounded-full px-2 py-0.5">
                        🌿 {shelf.forkCount} forks
                      </span>
                      {isMyShelf && (
                        <span className="text-xs text-[#F4845F] font-semibold bg-orange-50 rounded-full px-2 py-0.5">
                          Your shelf
                        </span>
                      )}
                    </div>
                  </div>

                  {shelf.sampleLinks?.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {shelf.sampleLinks.map((l) => (
                        <div key={l._id}
                          className="flex items-center justify-between bg-white/50 rounded-xl px-3 py-1.5">
                          <p className="text-xs text-[#1A1A2E] font-medium line-clamp-1 flex-1">
                            {l.title}
                          </p>
                          <VibePills vibes={l.vibes?.slice(0, 1)} />
                        </div>
                      ))}
                    </div>
                  )}

                  {isMyShelf ? (
                    <button
                      onClick={() => navigate(`/shelf/${shelf._id}`)}
                      className="mt-auto bg-white/70 border border-white/80 text-[#6B7280] text-sm font-semibold px-4 py-2 rounded-2xl hover:bg-white transition w-full"
                    >
                      Open My Shelf →
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFork(shelf)}
                      className="mt-auto bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white text-sm font-semibold px-4 py-2 rounded-2xl hover:opacity-90 transition w-full text-center"
                    >
                      🌿 Fork this shelf
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
