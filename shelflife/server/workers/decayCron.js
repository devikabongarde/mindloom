const cron = require('node-cron');
const Link = require('../models/Link');
const Shelf = require('../models/Shelf');
const Compost = require('../models/Compost');
const User = require('../models/User');
const { computeDecay } = require('../utils/decay');

function computeWeatherState({ linksAddedLastHour, linksAddedLast24h, linksTouchedLast7d, deathsLast24h }) {
  if (linksAddedLastHour > 5) return 'Stormy';
  if (linksAddedLastHour >= 1) return 'Active';
  if (linksTouchedLast7d === 0) return 'Dead';
  if (linksAddedLast24h === 0 && deathsLast24h === 0) return 'Foggy';
  return 'Foggy';
}

async function updateShelfWeather(io, now) {
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const shelves = await Shelf.find({}).select('_id weather');

  for (const shelf of shelves) {
    const [linksAddedLastHour, linksAddedLast24h, linksTouchedLast7d, clicksLastHour, deathsLastHour, deathsLast24h] = await Promise.all([
      Link.countDocuments({ shelfId: shelf._id, createdAt: { $gte: oneHourAgo } }),
      Link.countDocuments({ shelfId: shelf._id, createdAt: { $gte: oneDayAgo } }),
      Link.countDocuments({
        shelfId: shelf._id,
        $or: [{ createdAt: { $gte: sevenDaysAgo } }, { lastClickedAt: { $gte: sevenDaysAgo } }],
      }),
      Link.countDocuments({ shelfId: shelf._id, lastClickedAt: { $gte: oneHourAgo } }),
      Link.countDocuments({ shelfId: shelf._id, isDead: true, diedAt: { $gte: oneHourAgo } }),
      Link.countDocuments({ shelfId: shelf._id, isDead: true, diedAt: { $gte: oneDayAgo } }),
    ]);

    const activityScore = Math.max(
      0,
      Math.min(100, linksAddedLastHour * 20 + clicksLastHour * 5 - deathsLastHour * 10)
    );
    const state = computeWeatherState({ linksAddedLastHour, linksAddedLast24h, linksTouchedLast7d, deathsLast24h });

    const stateChanged =
      shelf.weather?.state !== state ||
      Math.round(shelf.weather?.activityScore || 0) !== Math.round(activityScore);

    shelf.weather = {
      state,
      activityScore,
      lastUpdated: now,
    };
    await shelf.save();

    if (stateChanged && io) {
      io.to(`shelf:${shelf._id.toString()}`).emit('shelf:weather:update', {
        state,
        activityScore,
      });
    }
  }
}

function initDecayCron(io) {
  // Run every hour
  cron.schedule(process.env.DECAY_CHECK_CRON || '0 * * * *', async () => {
    console.log('[Cron] Running decay check...');
    try {
      const now = new Date();
      
      // Find all alive links
      const aliveLinks = await Link.find({ isDead: false }).populate('shelfId');
      
      for (let link of aliveLinks) {
        const { decayPercent, decayStage, isDead } = computeDecay(link.lastClickedAt, now);
        
        // If state changed
        if (link.decayStage !== decayStage || link.decayPercent !== decayPercent) {
          link.decayPercent = decayPercent;
          link.decayStage = decayStage;
          
          if (isDead) { // Just reached stage 3
            link.isDead = true;
            link.diedAt = now;
            
            // 1. Move to compost
            const addedByUser = await User.findById(link.addedBy);
            const compostEntry = new Compost({
              originalLinkId: link._id,
              url: link.url,
              title: link.title,
              summary: link.summary,
              vibeType: link.vibeType,
              screenshotBase64: link.screenshotBase64,
              diedAt: now,
              diedFromShelfId: link.shelfId._id,
              diedFromShelfName: link.shelfId.name,
              addedByUsername: addedByUser ? addedByUser.username : 'Unknown'
            });
            await compostEntry.save();
            
            // 2. Remove from shelf.links array
            if(link.shelfId) {
                await Shelf.findByIdAndUpdate(link.shelfId._id, {
                  $pull: { links: link._id }
                });
            }

            // 3. Emit died event
            if (io && link.shelfId) {
              io.to(`shelf:${link.shelfId._id.toString()}`).emit('link:died', { linkId: link._id });
            }
          }
          
          await link.save();

          // 4. Update weather score (simplified version running on change)
          // Emitting regular decay update
          if (!isDead && io && link.shelfId) {
            io.to(`shelf:${link.shelfId._id.toString()}`).emit('link:decayUpdate', { 
               linkId: link._id, 
               decayPercent, 
               decayStage 
            });
          }
        }
      }

      await updateShelfWeather(io, now);
      console.log('[Cron] Decay check completed.');
    } catch (err) {
      console.error('[Cron] Decay job error:', err.message);
    }
  });
}

module.exports = initDecayCron;
