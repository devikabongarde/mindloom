const Link = require('../models/Link');

const VIBES = ['Chaotic', 'Educational', 'Cursed', 'HighSignal', 'Aesthetic', 'Liminal'];

const ARCHETYPES = {
  Chaotic: {
    title: 'The Chaos Archivist',
    threshold: 40,
    description: 'You save first and ask questions never.',
  },
  HighSignal: {
    title: 'The Signal Hunter',
    threshold: 40,
    description: 'Every link is a potential weapon of mass understanding.',
  },
  Cursed: {
    title: 'The Librarian of Broken Things',
    threshold: 30,
    description: 'You have seen things the algorithm tried to bury.',
  },
  Aesthetic: {
    title: 'The Aesthetic Pilgrim',
    threshold: 35,
    description: 'Your shelf is a mood board. Your mood is a manifesto.',
  },
  Educational: {
    title: 'The Eternal Student',
    threshold: 40,
    description: 'You learn everything. You ship nothing. Growth.',
  },
  Liminal: {
    title: 'The Liminal Wanderer',
    threshold: 30,
    description: 'You live between saves. The fog is your home.',
  },
};

function getDominantVibe(distribution) {
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Educational';
}

function mapToArchetype(distribution) {
  const dominantVibe = getDominantVibe(distribution);
  const dominantPct = distribution[dominantVibe] || 0;
  const archetype = ARCHETYPES[dominantVibe];

  if (archetype && dominantPct >= archetype.threshold) {
    return {
      title: archetype.title,
      description: archetype.description,
      dominantVibe,
    };
  }

  return {
    title: 'The Balanced Curator',
    description: 'You contain multitudes. The algorithm is confused.',
    dominantVibe,
  };
}

async function computeCuratorArchetype(addedByUserId) {
  const [counts, totalLinks] = await Promise.all([
    Link.aggregate([
      {
        $match: {
          addedBy: addedByUserId,
          scrapeStatus: 'complete',
          vibeType: { $in: VIBES },
        },
      },
      {
        $group: {
          _id: '$vibeType',
          count: { $sum: 1 },
        },
      },
    ]),
    Link.countDocuments({
      addedBy: addedByUserId,
      scrapeStatus: 'complete',
      vibeType: { $in: VIBES },
    }),
  ]);

  const vibeDistribution = {
    Chaotic: 0,
    Educational: 0,
    Cursed: 0,
    HighSignal: 0,
    Aesthetic: 0,
    Liminal: 0,
  };

  for (const row of counts) {
    const vibe = row._id;
    const pct = totalLinks > 0 ? Math.round((row.count / totalLinks) * 100) : 0;
    if (vibeDistribution[vibe] !== undefined) {
      vibeDistribution[vibe] = pct;
    }
  }

  const archetype = mapToArchetype(vibeDistribution);

  return {
    ...archetype,
    vibeDistribution,
    updatedAt: new Date(),
  };
}

module.exports = {
  computeCuratorArchetype,
};
