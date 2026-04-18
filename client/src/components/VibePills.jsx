import { vibeConfig } from '../utils/vibeConfig';

export default function VibePills({ vibes = [] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {vibes.map((vibe) => {
        const cfg = vibeConfig[vibe] || { bg: 'bg-white/70', text: 'text-[#5f7498]', glow: '' };
        return (
          <span
            key={vibe}
            className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-white/60 backdrop-blur ${cfg.bg} ${cfg.text} ${cfg.glow}`}
          >
            {vibe}
          </span>
        );
      })}
    </div>
  );
}
