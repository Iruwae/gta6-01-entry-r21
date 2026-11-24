// SOLMAR BAY — heat. Wanted stars rise with crimes and fall when the
// player stays out of sight; the pay-n-spray wipes them for cash. The
// police module reads the stars, this module owns the numbers.

import { setStars } from './state.js';

export function init(ctx) {
  const state = ctx.state;
  let hiddenTimer = 0;
  let lastSeen = 0;

  function addHeat(n, reason) {
    const before = state.stars;
    setStars(state, state.stars + n);
    if (state.stars > before) {
      ctx.bus.emit('wanted', { stars: state.stars, reason: reason || 'crime' });
      ctx.bus.emit('toast', { text: `Wanted level ${state.stars} — lose the tail!`, kind: 'bad' });
    }
    hiddenTimer = 0;
    return state.stars;
  }

  function clearHeat(paid) {
    if (state.stars === 0) return false;
    setStars(state, 0);
    hiddenTimer = 0;
    ctx.bus.emit('wanted', { stars: 0, reason: paid ? 'pay-n-spray' : 'escaped' });
    return true;
  }

  function update(dt) {
    if (state.stars === 0) return;
    // Are the cops still seeing the player? Any police unit within 45
    // units with line of sight keeps the heat on.
    const seen = ctx.police ? ctx.police.canSeePlayer() : true;
    if (seen) {
      hiddenTimer = 0;
      lastSeen = ctx.clock.elapsedTime;
    } else {
      hiddenTimer += dt;
    }
    // One star cools off every 25 seconds hidden; the last star takes 40.
    const coolTime = state.stars === 1 ? 40 : 25;
    if (hiddenTimer > coolTime) {
      setStars(state, state.stars - 1);
      hiddenTimer = 0;
      ctx.bus.emit('wanted', { stars: state.stars, reason: 'cooled off' });
      if (state.stars === 0) {
        ctx.bus.emit('toast', { text: 'You lost them. The bay is quiet again.', kind: 'good' });
        state.stats.escapes += 1;
        ctx.bus.emit('challenge-progress', { kind: 'clean', amount: 1 });
      }
    }
  }

  ctx.updaters.push(update);
  const api = { addHeat, clearHeat, update, get hiddenTimer() { return hiddenTimer; } };
  ctx.heat = api;
  return api;
}
