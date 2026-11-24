// SOLMAR BAY — the respect ladder. Respect is the game's real score:
// jobs, escapes, cruiser takedowns and hustles all feed it, and the
// rank name (NOBODY up to BAY LEGEND) is what the HUD shows next to
// the money. Rank-ups unlock garage tuning tiers and pay a bonus.

import { respectRank } from './state.js';

export function init(ctx) {
  const state = ctx.state;
  let lastRank = respectRank(ctx.config, state).name;

  function currentRank() {
    return respectRank(ctx.config, state);
  }

  function nextRank() {
    const ranks = ctx.config.respectRanks;
    for (const r of ranks) {
      if (state.respect < r.at) return r;
    }
    return null;
  }

  function update() {
    if (ctx.state.paused) return;
    const rank = currentRank().name;
    if (rank !== lastRank) {
      lastRank = rank;
      const bonus = 100 * ctx.config.respectRanks.findIndex((r) => r.name === rank);
      state.money += bonus;
      ctx.bus.emit('toast', { text: `RESPECT UP — you are now ${rank}. Bonus $${bonus}.`, kind: 'good' });
      ctx.dialogue.say('Vic Torres', `The street is talking. ${rank} — keep climbing.`, 5);
      ctx.bus.emit('rank-up', { rank });
    }
  }

  ctx.updaters.push(update);
  const api = { currentRank, nextRank, update };
  ctx.respect = api;
  return api;
}
