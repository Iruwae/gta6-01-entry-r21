// SOLMAR BAY — the day/night cycle. Game time runs about 8 minutes per
// full day, so a golden-hour start slides into neon night inside one
// session. This module advances the clock, drives the sky and the
// streetlights, and tells the HUD what to show.

export function init(ctx) {
  const state = ctx.state;
  const DAY_LENGTH_SEC = 480; // one full 24h cycle per 8 real minutes

  function hourLabel() {
    const h = Math.floor(state.time);
    const m = Math.floor((state.time - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function isNight() {
    return state.time >= 19.5 || state.time < 5.5;
  }

  function isGoldenHour() {
    return state.time >= 16.5 && state.time < 19.5;
  }

  function update(dt) {
    if (ctx.state.paused) return;
    state.time += (dt / DAY_LENGTH_SEC) * 24;
    if (state.time >= 24) {
      state.time -= 24;
      state.day += 1;
      state.earnedToday = 0;
      ctx.bus.emit('newday', { day: state.day });
    }
    const { night } = ctx.sky.setSun(state.time);
    // Streetlights glow after dusk.
    const glow = night > 0 ? 0.4 + night * 1.8 : 0.15;
    for (const lamp of ctx.city.lamps) lamp.emissiveIntensity = glow;
    // The bay shimmers a little more at sunset.
    if (ctx.water) {
      ctx.water.material.opacity = 0.88 + 0.06 * Math.sin(ctx.clock.elapsedTime * 0.7);
    }
  }

  ctx.updaters.push(update);

  const api = { hourLabel, isNight, isGoldenHour, update };
  ctx.daynight = api;
  return api;
}
