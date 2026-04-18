import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

export default function Curator() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get(`/users/${username}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [username]);

  if (loading) return <div className="p-8">Locating Curator...</div>;
  if (!data) return <div className="p-8">Curator not found.</div>;

  const { curatorArchetype, avatarColor } = data;

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <div className="glass-panel p-8 max-w-lg w-full relative overflow-hidden group">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-transparent to-current transition-opacity duration-1000" style={{ color: avatarColor }}></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full mb-6 shimmer-effect border-4 border-surface" style={{ backgroundColor: avatarColor }}></div>
          <h2 className="text-xl font-mono text-white/50 mb-2">@{data.username}</h2>
          <h1 className="text-4xl font-black font-sans mb-4 tracking-tight" style={{ color: avatarColor }}>{curatorArchetype?.title || 'The Wanderer'}</h1>
          <p className="text-white/80 font-mono mb-8">{curatorArchetype?.description || 'Gathering fragments.'}</p>
          
          {/* Vibe distribution (simplified) */}
          <div className="w-full h-4 bg-surface rounded-full flex overflow-hidden mb-6">
            {curatorArchetype?.vibeDistribution && Object.entries(curatorArchetype.vibeDistribution).map(([vibe, percent]) => {
              if(!percent) return null;
              const colorMap = { Chaotic:'#FF6B35', Educational:'#4FC3F7', Cursed:'#9C27B0', HighSignal:'#00FF9C', Aesthetic:'#FF80AB', Liminal:'#B0BEC5' };
              return <div key={vibe} style={{ width:`${percent}%`, backgroundColor: colorMap[vibe] }} title={`${vibe}: ${percent}%`}></div>
            })}
          </div>

          <div className="flex gap-8 text-sm font-mono text-white/50">
             <div><span className="text-white block text-lg font-sans font-bold">{data.publicShelvesCount}</span> Public Shelves</div>
             <div><span className="text-white block text-lg font-sans font-bold">{data.totalShelves}</span> Total Shelves</div>
          </div>
        </div>
      </div>
    </div>
  );
}
