// SOLMAR BAY — Vic's fence. Drive a car into the yard and press V to
// sell it: the fence pays the car's value plus a cut of its tuning,
// and a clean sale earns respect. No car, no sale — the fence does not
// buy promises.

import { CONFIG } from './config.js';
import { addMoney, addRespect } from './state.js';

export function init(ctx) {
  const state = ctx.state;

  function nearFence() {
    const f = CONFIG.places.fence;
    const p = ctx.player.pos;
    return Math.hypot(p.x - f.x, p.z - f.z) < 16;
  }

  function sell() {
    const car = state.inCar;
    if (!car) {
      ctx.bus.emit('toast', { text: 'Bring a car to sell. The fence does not buy promises.', kind: 'info' });
      return;
    }
    if (car.label === "Vic's sedan") {
      ctx.bus.emit('toast', { text: 'Vic would notice his own sedan missing. Not that one.', kind: 'bad' });
      return;
    }
    const tuningValue = (car.tuning?.engine || 0) * 120 + (car.tuning?.armor || 0) * 90 + (car.tuning?.nos || 0) * 150;
    const price = Math.round(car.value * 0.6 + tuningValue);
    addMoney(state, price);
    addRespect(state, 25);
    ctx.vehicles.removeCar(car);
    ctx.player.car = null;
    ctx.player.onFoot = true;
    ctx.player.group.visible = true;
    state.inCar = null;
    ctx.bus.emit('pickup', {});
    ctx.bus.emit('toast', { text: `Sold the ${car.label} for $${price}. +25 respect.`, kind: 'good' });
    ctx.bus.emit('sold-car', { price, label: car.label });
  }

  function update() {
    if (ctx.state.paused || ctx.state.cutscene) return;
    if (nearFence() && ctx.input.wasPressed('KeyV')) sell();
  }

  ctx.updaters.push(update);
  const api = { sell, update };
  ctx.fence = api;
  return api;
}
