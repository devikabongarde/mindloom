import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import MoodPill from './MoodPill';
import api from '../../lib/api';

export default function LinkCard({ link, onResurrect, onReact }) {
  const [checkingContext, setCheckingContext] = useState(false);
  const [contextData, setContextData] = useState(link.contextFeed);
  const [showContext, setShowContext] = useState(false);

  const isPending = link.scrapeStatus === 'pending';
  const isProcessing = ['scraping', 'ai_processing'].includes(link.scrapeStatus);
  const isComplete = link.scrapeStatus === 'complete';
  const isFailed = link.scrapeStatus === 'failed';

  // Decay mechanics
  const decayPercent = link.decayPercent || 0;
  const decayStage = link.decayStage || 0;
  const isDead = link.isDead || decayStage === 3;

  const getDecayStyles = () => {
    if (isPending || isProcessing) return {};
    return {
      filter: `saturate(${100 - decayPercent}%) brightness(${100 - decayPercent * 0.3}%)`,
      transform: `scale(${1 - decayPercent * 0.003})`,
      opacity: decayPercent > 80 ? 0.5 : 1,
    };
  };

  const decayLabel = 
    decayStage === 0 ? "Fresh" : 
    decayStage === 1 ? "Aging" : 
    decayStage === 2 ? "Critical — act now" : "Dead";

  const handleCardClick = async () => {
    if (isDead) return; // Dead cannot be resurrected directly via normal click unless via compost? PRD says click resets. But dead is moved to compost. Wait. "Clicking a link resets lastClickedAt... UI: clicking a grayed-out link triggers a resurrection animation"
    if (onResurrect) {
      try {
        await onResurrect(link._id);
      } catch (err) {
        console.error(err);
      }
    }
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleCheckContext = async (e) => {
    e.stopPropagation();
    setCheckingContext(true);
    try {
      const res = await api.get(`/links/${link._id}/context`);
      setContextData(res.data);
      setShowContext(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingContext(false);
    }
  };

  const handleReact = (e, emoji) => {
    e.stopPropagation();
    if(onReact) onReact(link._id, emoji);
  };

  // Render Skeletons for pending
  if (isPending || isProcessing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-4 flex flex-col gap-3 min-h-[300px] animate-pulse"
      >
        <div className="h-32 bg-white/10 rounded-md w-full"></div>
        <div className="h-6 bg-white/10 rounded w-3/4"></div>
        <div className="h-4 bg-white/10 rounded w-full"></div>
        <div className="h-4 bg-white/10 rounded w-5/6"></div>
        <div className="mt-auto flex justify-between">
          <div className="h-6 bg-white/10 rounded-full w-16"></div>
          <div className="h-4 bg-white/10 rounded w-24"></div>
        </div>
      </motion.div>
    );
  }

  // Float reaction calculation (UI simulation)
  // Actually, we need global floating reactions, we can trigger localized keyframes

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ ...getDecayStyles(), transition: { duration: 1, ease: "easeOut" } }}
      exit={{ opacity: 0, scale: 0.8, filter: 'grayscale(100%)' }} // Death animation
      onClick={handleCardClick}
      className={`glass-panel overflow-hidden relative cursor-pointer group flex flex-col ${isDead ? 'pointer-events-none' : ''}`}
    >
      {/* Thumbnail */}
      <div className="h-40 w-full bg-black relative overflow-hidden">
        {link.screenshotBase64 ? (
          <img src={link.screenshotBase64} alt={link.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">No screenshot</div>
        )}
        <div className="absolute top-2 right-2">
          {link.vibeType && <MoodPill vibeType={link.vibeType} vibeScore={link.vibeScore} vibeReasoning={link.vibeReasoning} />}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-2 mb-2">
          {link.faviconUrl && <img src={link.faviconUrl} className="w-4 h-4 mt-1" alt="" />}
          <h3 className={`font-bold text-lg leading-tight ${isDead ? 'line-through text-white/50' : 'text-white'}`}>{link.title || link.url}</h3>
        </div>
        
        <p className="text-white/60 text-sm mb-4 font-mono line-clamp-3 leading-relaxed">
          {link.summary}
        </p>

        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {link.tags.map(t => (
              <span key={t} className="text-[10px] uppercase text-white/40 border border-white/10 px-2 py-0.5 rounded">#{t}</span>
            ))}
          </div>
        )}

        <div className="mt-auto">
          {/* Metadata */}
          <div className="flex justify-between items-center text-[10px] text-white/40 font-mono mb-3">
             <span>{decayLabel}</span>
             <span>Saved {formatDistanceToNow(new Date(link.createdAt))} ago</span>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex gap-2">
              {['🔥', '💀', '👀', '⚡', '🌿'].map(emoji => {
                const count = link.reactions?.filter(r => r.emoji === emoji).length || 0;
                if(count === 0 && !isDead) return (
                  <button key={emoji} onClick={(e) => handleReact(e, emoji)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:scale-125">{emoji}</button>
                );
                if(count > 0) return (
                  <button key={emoji} onClick={(e) => handleReact(e, emoji)} className="text-xs flex items-center gap-1 bg-white/5 px-2 py-1 rounded hover:bg-white/10">
                    <span>{emoji}</span>
                    <span className="text-[10px]">{count}</span>
                  </button>
                );
                return null;
              })}
            </div>
            
            <button 
              onClick={handleCheckContext} 
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded uppercase font-bold"
              disabled={checkingContext || isDead}
            >
              {checkingContext ? 'Checking...' : 'Context'}
            </button>
          </div>

          <AnimatePresence>
            {showContext && contextData && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 border border-white/10 rounded-md bg-white/5 p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wide text-white/50">Context Feed</span>
                  <span className="text-[10px] font-mono text-white/40">{contextData.relevanceStatus || 'Unknown'}</span>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">{contextData.summary || 'No context data available.'}</p>
                {contextData.successorUrl && (
                  <a
                    href={contextData.successorUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-block text-[11px] text-vibe-Educational hover:underline"
                  >
                    {contextData.successorTitle || 'Suggested newer source'}
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Decay Progress Bar */}
      <motion.div 
        className={`absolute bottom-0 left-0 h-1 ${decayPercent > 80 ? 'bg-red-500' : decayPercent > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
        animate={{ width: `${decayPercent}%` }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );
}
