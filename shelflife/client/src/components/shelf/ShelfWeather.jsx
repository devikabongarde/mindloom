import { motion } from 'framer-motion';

export default function ShelfWeather({ state = 'Foggy', activityScore = 0 }) {
  // state: "Stormy" | "Active" | "Foggy" | "Dead"
  
  const WEATHER_CONFIG = {
    Stormy: {
      emoji: '⛈',
      label: 'Stormy',
      desc: 'Heavy curation session in progress',
      bgClass: 'bg-gradient-to-r from-[#0F0F1A] via-[#1A1A2E] to-[#0F0F1A] bg-[length:200%_100%] animate-[shimmer_3s_infinite]'
    },
    Active: {
      emoji: '🌤',
      label: 'Active',
      desc: "Someone's on a discovery run",
      bgClass: 'bg-gradient-to-r from-background via-vibe-Educational/10 to-background'
    },
    Foggy: {
      emoji: '🌫',
      label: 'Foggy',
      desc: 'Shelf abandoned — content sleeping',
      bgClass: 'bg-background bg-opacity-90 backdrop-blur-sm'
    },
    Dead: {
      emoji: '💀',
      label: 'Dead',
      desc: 'This shelf has not been touched in a week',
      bgClass: 'bg-[url("/noise.png")] bg-repeat opacity-50 grayscale' // simplified noise
    }
  };

  const config = WEATHER_CONFIG[state] || WEATHER_CONFIG.Foggy;

  return (
    <div className={`absolute inset-0 pointer-events-none -z-10 transition-all duration-1000 ${config.bgClass}`}>
      {/* Lightning effect for stormy */}
      {state === 'Stormy' && (
        <motion.div 
          className="absolute inset-0 bg-white"
          animate={{ opacity: [0, 0, 0, 0.1, 0, 0, 0.2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
      )}
      
      {/* Visual weather indicator rendered in document flow as a child usually, 
          but if this wraps the shelf, we might return just backgrounds. 
          The PRD says: "Widget in shelf header: Renders emoji + state label + activity score".
          So let's separate the background logic from the widget logic. 
      */}
    </div>
  );
}

export function ShelfWeatherWidget({ state = 'Foggy', activityScore = 0 }) {
  const WEATHER_CONFIG = {
    Stormy: { emoji: '⛈', label: 'Stormy' },
    Active: { emoji: '🌤', label: 'Active' },
    Foggy: {  emoji: '🌫', label: 'Foggy' },
    Dead: {   emoji: '💀', label: 'Dead' }
  };
  const config = WEATHER_CONFIG[state] || WEATHER_CONFIG.Foggy;

  return (
    <div className="flex items-center gap-3 glass-panel px-4 py-2 w-fit">
      <span className="text-2xl">{config.emoji}</span>
      <div className="flex flex-col">
        <span className="text-sm font-bold font-sans tracking-wide uppercase text-white/80">{config.label}</span>
        <span className="text-[10px] font-mono text-white/40">Activity: {Math.round(activityScore)}</span>
      </div>
    </div>
  );
}
