import { motion } from 'framer-motion';

const VIBE_COLORS = {
  HighSignal: '#00FF9C',
  Educational: '#4FC3F7',
  Chaotic: '#FF6B35',
  Cursed: '#9C27B0',
  Aesthetic: '#FF80AB',
  Liminal: '#B0BEC5'
};

const VIBE_ANIMATIONS = {
  HighSignal: 'animate-shimmer',
  Chaotic: 'animate-pulse-fast',
  Cursed: 'animate-flicker',
  Educational: '',
  Aesthetic: '',
  Liminal: ''
};

export default function MoodPill({ vibeType, vibeScore, vibeReasoning }) {
  if (!vibeType) return null;
  const color = VIBE_COLORS[vibeType] || '#ffffff';
  const animClass = VIBE_ANIMATIONS[vibeType] || '';
  
  // Calculate glow based on score 0-100
  const glowAlpha = Math.max(0.1, vibeScore / 100);
  const boxShadow = `0 0 ${10 + (vibeScore / 5)}px rgba(${hexToRgb(color)}, ${glowAlpha})`;

  return (
    <div 
      className={`relative group inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono uppercase cursor-default ${animClass}`}
      style={{ 
        backgroundColor: `${color}20`, 
        color: color, 
        border: `1px solid ${color}40`,
        boxShadow
      }}
      title={vibeReasoning}
    >
      <span className="relative z-10">{vibeType}</span>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-surface border border-white/10 rounded text-[10px] lowercase text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {vibeReasoning}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '255, 255, 255';
}
