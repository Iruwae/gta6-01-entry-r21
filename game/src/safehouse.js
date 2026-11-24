// SOLMAR BAY — the safehouse. Press H near it to rest: full health,
// the clock jumps to 08:00 the next morning, and one star of heat
// cools off. It is the only place the day actually ends — sleeping
// here is how a new day (and new daily challenges) begins.

import { CONFIG } from './config.js';
import { healPlayer, setStars } from './state.js';

export function init(ctx) {
  const state = ctx.state;

  function nearSafehouse() {
    const s = CONFIG.places.safehouse;
    const p = ctx.player.pos;
    return Math.hypot(p.x - s.x, p.z - s.z) < 14;
  }

  function rest() {
    healPlayer(state, 100);
    state.armor = Math.max(state.armor, 25);
    if (state.stars > 0) setStars(state, state.stars - 1);
    state.time = 8;
    state.day += 1;
    state.earnedToday = 0;
    ctx.bus.emit('toast', { text: `Day ${state.day} — 08:00. Rested, healed, one star cooler.`, kind: 'good' });
    ctx.bus.emit('newday', { day: state.day });
    ctx.dialogue.say('Lena Cruz', 'Sleep it off. The bay will still be there tomorrow.', 4);
  }

  function update() {
    if (ctx.state.paused || ctx.state.cutscene) return;
    if (nearSafehouse() && ctx.input.wasPressed('KeyH')) rest();
  }

  ctx.updaters.push(update);
  const api = { rest, update };
  ctx.safehouse = api;
  return api;
}
