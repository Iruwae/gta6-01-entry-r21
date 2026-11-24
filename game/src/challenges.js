// SOLMAR BAY — daily challenges. Three targets a day, drawn from the
// config pool by the day number; hitting one pays out the moment the
// target lands. Progress comes from the bus (escapes, races) and from
// the state itself (money earned, packages, fares).

import { CONFIG } from './config.js';
import { addMoney } from './state.js';

export function init(ctx) {
  const state = ctx.state;
  let active = [];
  let done = new Set();

  function pickForDay(day) {
    const pool = CONFIG.challenges.slice();
    const rng = ctx.rng;
    // Rotate deterministically by day so every day feels different.
    const start = (day - 1) % pool.length;
    const out = [];
    for (let i = 0; i < 3; i++) out.push(pool[(start + i) % pool.length]);
    return out.map((c) => ({ ...c, progress: 0 }));
  }

  function progressOf(c) {
    switch (c.kind) {
      case 'earn': return state.earnedToday;
      case 'race': return state.racesWon;
      case 'packs': return state.packagesCollected;
      case 'fares': return state.faresDone;
      case 'clean': return c.progress;
      default: return 0;
    }
  }

  function refresh() {
    active = pickForDay(state.day);
    done = new Set();
  }

  function checkAll() {
    for (const c of active) {
      if (done.has(c.id)) continue;
      const p = progressOf(c);
      c.progress = p;
      if (p >= c.target) {
        done.add(c.id);
        addMoney(state, c.reward);
        ctx.bus.emit('toast', { text: `Challenge done: ${c.text} — +$${c.reward}!`, kind: 'good' });
        ctx.bus.emit('challenge-done', { id: c.id, reward: c.reward });
      }
    }
  }

  ctx.bus.on('challenge-progress', (e) => {
    for (const c of active) {
      if (c.kind === e.kind) c.progress += e.amount || 1;
    }
    checkAll();
  });
  ctx.bus.on('newday', () => {
    refresh();
    ctx.bus.emit('toast', { text: `Day ${state.day} — new daily challenges.`, kind: 'info' });
  });

  refresh();

  function update() {
    if (ctx.state.paused) return;
    checkAll();
  }

  ctx.updaters.push(update);
  const api = { get active() { return active; }, refresh, checkAll, update };
  ctx.challenges = api;
  return api;
}
