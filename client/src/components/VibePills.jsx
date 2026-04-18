import { vibeConfig } from '../utils/vibeConfig';

export default function VibePills({ vibes = [] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {vibes.map((vibe) => {
        const cfg = vibeConfig[vibe] || { bg: 'bg-gray-100', text: 'text-gray-600', glow: '' };
        return (
          <span
            key={vibe}
            className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${cfg.bg} ${cfg.text} ${cfg.glow}`}
          >
            {vibe}
          </span>
        );
      })}
    </div>
  );
}
