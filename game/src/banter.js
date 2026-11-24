// SOLMAR BAY — street banter. Pedestrians and passing drivers throw out
// one-liners now and then; the lines are flavour, never objectives.
// The radio talk station borrows the same pool for its callers.

import { pick } from './random.js';

export const BANTER_LINES = [
  'You see the sunset? The bay does that every night, free of charge.',
  'My cousin drives a taxi. He says the night shift pays double.',
  'Vic is hiring again. You in, or you scared?',
  'They say the Neon Mile never sleeps. Neither do the cops.',
  'I saw Lena drive once. I still dream about it.',
  'This city eats slow drivers for breakfast.',
  'If the heli is up, walk — do not run. Running looks guilty.',
  'The MART has the best cafecito on this side of the bay.',
  'You hear that? That is the sound of rent going up.',
  'Golden hour makes everybody look like a movie star.',
];

export function init(ctx) {
  const rng = ctx.rng;
  let timer = 20 + rng() * 15;

  function update(dt) {
    if (ctx.state.paused) return;
    timer -= dt;
    if (timer <= 0) {
      timer = 24 + rng() * 22;
      const p = ctx.people.pedestrians[Math.floor(rng() * ctx.people.pedestrians.length)];
      if (p && p.pos.distanceTo(ctx.player.pos) < 40) {
        ctx.bus.emit('toast', { text: `${p.name}: “${pick(rng, BANTER_LINES)}”`, kind: 'info' });
      }
    }
  }

  ctx.updaters.push(update);
  const api = { update, lines: BANTER_LINES };
  ctx.banter = api;
  return api;
}
