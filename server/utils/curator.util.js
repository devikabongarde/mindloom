// Computes a curator archetype from the user's vibeStats object
export function computeArchetype(vibeStats = {}) {
  const entries = Object.entries(vibeStats || {});
  const hasAny = entries.some(([, v]) => v > 0);

  if (!hasAny) {
    return {
      name: 'Fresh Soul',
      description: 'You just started curating. The shelf is waiting for your taste.',
    };
  }

  const [dominant] = entries.reduce(
    (max, cur) => (cur[1] > max[1] ? cur : max),
    ['None', 0]
  );

  switch (dominant) {
    case 'HighSignal':
      return { name: 'Signal Hunter',       description: 'You filter out noise and only bookmark the sharpest ideas.' };
    case 'Educational':
      return { name: 'Knowledge Librarian', description: 'You collect guides, docs, and deep dives for future you.' };
    case 'Chaotic':
      return { name: 'Chaos Goblin',        description: 'You live on cursed threads and weird rabbit holes.' };
    case 'Cursed':
      return { name: 'Dark Archivist',      description: "You save the internet's strangest artifacts." };
    case 'Inspirational':
      return { name: 'Muse Whisperer',      description: 'You hoard inspiration and creative sparks.' };
    default:
      return { name: 'Mixed Curator',       description: 'You have a balanced shelf with multiple energies.' };
  }
}
