import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';

export default function CompostPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    const fetchCompost = async () => {
      try {
        const res = await api.get('/compost');
        setItems(res.data.items);
        setStats({ total: res.data.total || res.data.items.length * 2 }); // stub stats
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompost();
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] p-8">
      <header className="max-w-6xl mx-auto mb-16 text-center">
        <h1 className="text-5xl font-sans tracking-tight text-white/30 mb-4 inline-flex items-center gap-4">
          <span>💀</span> The Compost Heap <span>💀</span>
        </h1>
        <p className="text-white/40 font-mono">
           {stats.total} links died this week. Most common cause of death: neglect.
        </p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="text-center w-full col-span-full">Digging...</div>
        ) : items.map((item, i) => (
          <motion.div 
            key={item._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel filter grayscale border-white/5 opacity-80 hover:opacity-100 transition-opacity"
            onClick={() => window.open(item.url, '_blank')}
          >
            <div className="h-32 w-full bg-black relative">
              {item.screenshotBase64 ? (
                <img src={item.screenshotBase64} alt="" className="w-full h-full object-cover opacity-50" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 text-xs text-center border-b border-white/5">Image Lost</div>
              )}
            </div>
            <div className="p-4 flex flex-col">
              <h3 className="font-bold text-sm text-white/70 overflow-hidden text-ellipsis whitespace-nowrap mb-2">{item.title || item.url}</h3>
              <p className="text-xs text-white/40 font-mono mb-4 line-clamp-2">{item.summary}</p>
              
              <div className="mt-auto pt-3 border-t border-white/5 text-[10px] text-white/30 truncate">
                Died {formatDistanceToNow(new Date(item.diedAt))} ago <br />
                from {item.diedFromShelfName} ({item.addedByUsername})
              </div>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
