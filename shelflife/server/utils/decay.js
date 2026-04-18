/**
 * Computes decay state for a link.
 *
 * @param {Date} lastClickedAt - Last time user clicked this link
 * @param {Date} now - Current time (defaults to Date.now())
 * @returns {{ decayPercent, decayStage, isDead, daysSinceClick }}
 */
function computeDecay(lastClickedAt, now = new Date()) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysSinceClick = (now - new Date(lastClickedAt)) / MS_PER_DAY;

  let decayPercent = 0;
  let decayStage = 0;
  let isDead = false;

  if (daysSinceClick >= 14 && daysSinceClick < 22) {
    decayPercent = Math.round(((daysSinceClick - 14) / 8) * 40); // 0–40%
    decayStage = 1;
  } else if (daysSinceClick >= 22 && daysSinceClick < 30) {
    decayPercent = Math.round(40 + ((daysSinceClick - 22) / 8) * 40); // 40–80%
    decayStage = 2;
  } else if (daysSinceClick >= 30) {
    decayPercent = 100;
    decayStage = 3;
    isDead = true;
  }

  return { decayPercent, decayStage, isDead, daysSinceClick: Math.floor(daysSinceClick) };
}

module.exports = { computeDecay };
