import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useShelfStore } from '../store/useShelfStore';
import { useSocketStore } from '../store/useSocketStore';
import LinkCard from '../components/shelf/LinkCard';
import ShelfWeather, { ShelfWeatherWidget } from '../components/shelf/ShelfWeather';

export default function Shelf() {
  const { id } = useParams();
  const { activeShelf, fetchShelf, addLinkToShelf, clickLink, reactToLink, loading } = useShelfStore();
  const { joinShelf, emitCursor, remoteCursors } = useSocketStore();
  const [urlInput, setUrlInput] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    fetchShelf(id);
    joinShelf(id);
  }, [id]);

  const handlePointerMove = (e) => {
    // Relative coordinates
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // We throttle inside socket store but emit here
    emitCursor(x, y, id);
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    // Add logic goes directly to store
    await addLinkToShelf(urlInput, id);
    setUrlInput('');
  };

  const handleResurrect = async (linkId) => {
    try {
      await clickLink(linkId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = async (linkId, emoji) => {
    try {
      await reactToLink(linkId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !activeShelf) return <div className="p-8">Loading Shelf...</div>;

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col" 
      onPointerMove={handlePointerMove}
      ref={containerRef}
    >
      <ShelfWeather state={activeShelf.weather?.state} activityScore={activeShelf.weather?.activityScore} />
      
      {/* Header */}
      <header className="p-6 flex justify-between items-start relative z-10">
        <div>
          <h1 className="text-4xl font-bold font-sans tracking-tight mb-2">{activeShelf.name}</h1>
          <p className="text-white/60 font-mono text-sm max-w-xl">{activeShelf.description}</p>
        </div>
        <ShelfWeatherWidget state={activeShelf.weather?.state} activityScore={activeShelf.weather?.activityScore} />
      </header>

      {/* Input Bar */}
      <div className="px-6 relative z-10 mb-8 max-w-3xl">
        <form onSubmit={handleAddLink} className="relative">
          <input 
            type="url" 
            placeholder="Paste a URL to resurrect it..." 
            className="input-field py-4 text-lg pr-32"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            required
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 bg-white/10 hover:bg-white/20 px-6 rounded-md font-bold uppercase transition-colors">
            Drop
          </button>
        </form>
      </div>

      {/* Grid */}
      <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeShelf.links.map(link => (
            <LinkCard key={link._id} link={link} onResurrect={handleResurrect} onReact={handleReact} />
          ))}
          {activeShelf.links.length === 0 && (
             <div className="col-span-full h-64 flex items-center justify-center text-white/30 border border-dashed border-white/10 rounded-xl">
               No links yet. The archive is born.
             </div>
          )}
        </div>
      </main>

      {/* Live Cursors */}
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
         <div key={userId} 
              className="absolute pointer-events-none transition-all duration-200 ease-out z-50 flex flex-col items-center"
              style={{ 
                left: `${cursor.x * 100}%`, 
                top: `${cursor.y * 100}%` 
              }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color} stroke="white" strokeWidth="1" transform="rotate(-45)">
              <path d="M2.5 2.5L20.5 10L12 12L10 20.5L2.5 2.5Z"></path>
            </svg>
            <span className="bg-black/50 backdrop-blur px-2 text-[10px] rounded mt-1" style={{ color: cursor.color }}>
              {cursor.username}
            </span>
         </div>
      ))}
    </div>
  );
}
