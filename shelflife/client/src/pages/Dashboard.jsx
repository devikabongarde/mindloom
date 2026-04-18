import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShelfStore } from '../store/useShelfStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { shelves, fetchShelves, loading } = useShelfStore();
  
  const [newShelfName, setNewShelfName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchShelves();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/shelves', { name: newShelfName, isPublic: true });
      navigate(`/shelf/${res.data._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold font-sans text-vibe-HighSignal tracking-tighter">ShelfLife</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: user?.avatarColor }}></div>
            <span className="font-mono text-sm">{user?.username}</span>
          </div>
          <button onClick={logout} className="text-xs uppercase bg-white/10 px-3 py-1 hover:bg-white/20 rounded">Logout</button>
        </div>
      </header>

      <section className="mb-12 glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 font-sans">Create a New Shelf</h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input 
            type="text" 
            value={newShelfName} 
            onChange={e => setNewShelfName(e.target.value)} 
            placeholder="Name your archive..." 
            className="input-field max-w-md"
            required
          />
          <button type="submit" disabled={creating} className="bg-vibe-Educational/20 text-vibe-Educational hover:bg-vibe-Educational/30 px-6 font-bold uppercase rounded transition-colors whitespace-nowrap">
            {creating ? 'Spawning...' : 'Create Shelf'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 font-sans">Your Active Shelves</h2>
        {loading ? (
          <div className="animate-pulse flex gap-4"><div className="h-40 w-64 bg-white/10 rounded-xl"></div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {shelves.map(shelf => (
              <Link to={`/shelf/${shelf._id}`} key={shelf._id} className="glass-panel p-6 group cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-xl font-bold mb-2 pt-2 relative z-10">{shelf.name}</h3>
                <div className="flex justify-between items-center text-xs font-mono text-white/50 relative z-10 mt-8">
                  <span>{shelf.links?.length || 0} links</span>
                  <span className="capitalize">{shelf.weather?.state || 'Foggy'}</span>
                </div>
              </Link>
            ))}
            {shelves.length === 0 && <p className="text-white/40 italic">You have no shelves yet.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
