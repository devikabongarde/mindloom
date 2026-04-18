import Link from '../models/Link.js';
import Notification from '../models/Notification.js';

const DECAY_WARNING_MINUTES = 25;
const DECAY_DEAD_MINUTES = 30;
const REMINDER_SCAN_INTERVAL_MS = 5 * 60 * 1000;

function getMinutesIdle(lastClickedAt) {
  const ts = new Date(lastClickedAt).getTime();
  if (!Number.isFinite(ts)) return 0;
  return (Date.now() - ts) / 1000 / 60;
}

async function createNotificationIfMissing(filter, payload) {
  const existing = await Notification.findOne(filter).select('_id').lean();
  if (existing) return false;
  await Notification.create(payload);
  return true;
}

async function scanDecayNotifications() {
  const links = await Link.find({ addedBy: { $ne: null } })
    .select('_id addedBy title lastClickedAt shelfId')
    .lean();

  const dayKey = new Date().toISOString().slice(0, 10);
  let warningsCreated = 0;
  let remindersCreated = 0;

  for (const link of links) {
    const minutesIdle = getMinutesIdle(link.lastClickedAt);
    const lastClickedAtMs = new Date(link.lastClickedAt).getTime();

    if (minutesIdle >= DECAY_WARNING_MINUTES && minutesIdle < DECAY_DEAD_MINUTES) {
      const label = link.title || 'One of your links';
      const created = await createNotificationIfMissing(
        {
          userId: link.addedBy,
          type: 'link_decay_warning',
          'meta.linkId': link._id,
          'meta.lastClickedAtMs': lastClickedAtMs,
        },
        {
          userId: link.addedBy,
          actorId: null,
          type: 'link_decay_warning',
          title: `${label} is about to decay`,
          message: `${label} is almost in compost. Open it soon to keep it alive.`,
          meta: {
            linkId: link._id,
            shelfId: link.shelfId,
            lastClickedAtMs,
            warningAtMinutes: DECAY_WARNING_MINUTES,
          },
          isRead: false,
        }
      );
      if (created) warningsCreated += 1;
      continue;
    }

    if (minutesIdle >= DECAY_DEAD_MINUTES) {
      const label = link.title || 'One of your links';
      const created = await createNotificationIfMissing(
        {
          userId: link.addedBy,
          type: 'link_decay_reminder',
          'meta.linkId': link._id,
          'meta.dayKey': dayKey,
        },
        {
          userId: link.addedBy,
          actorId: null,
          type: 'link_decay_reminder',
          title: `${label} is still in compost`,
          message: `${label} is in compost. Restore it before it fades away more.`,
          meta: {
            linkId: link._id,
            shelfId: link.shelfId,
            dayKey,
            deadAtMinutes: Math.floor(minutesIdle),
          },
          isRead: false,
        }
      );
      if (created) remindersCreated += 1;
    }
  }

  return { warningsCreated, remindersCreated };
}

export function startDecayReminderScheduler() {
  const runOnce = async () => {
    try {
      const result = await scanDecayNotifications();
      if (result.warningsCreated || result.remindersCreated) {
        console.log(
          `Decay reminders: ${result.warningsCreated} warnings, ${result.remindersCreated} reminders`
        );
      }
    } catch (err) {
      console.error('Decay reminder scan failed:', err.message);
    }
  };

  void runOnce();
  const intervalId = setInterval(runOnce, REMINDER_SCAN_INTERVAL_MS);
  return intervalId;
}
