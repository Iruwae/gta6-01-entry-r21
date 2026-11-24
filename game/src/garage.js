// SOLMAR BAY — the garage. Press G near the garage to open the tuning
// shop: engine, armor, paint and NOS, four levels each, priced from the
// config. The same key stores the car you are driving and spawns a
// stored car back. Tuning applies to the car you are in right now.

import { CONFIG } from './config.js';

const LINES = [
  ['engine', 'Engine', 'Top speed and acceleration.'],
  ['armor', 'Armor', 'Soaks up rams and bullets.'],
  ['paint', 'Paint', 'Fresh colours for the bay.'],
  ['nos', 'NOS', 'A bottle of liquid hurry.'],
];

export function init(ctx) {
  const state = ctx.state;
  let open = false;
  let panel = null;

  function nearGarage() {
    const g = CONFIG.places.garage;
    const p = ctx.player.pos;
    return Math.hypot(p.x - g.x, p.z - g.z) < 16;
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'garage-panel';
    panel.className = 'menu-panel';
    document.body.appendChild(panel);
    render();
  }

  function render() {
    if (!panel) return;
    const t = state.tuning;
    let html = '<h2>GARAGE — Tuning &amp; Storage</h2>';
    html += `<p class="menu-money">Cash: $${state.money} &nbsp;·&nbsp; Stored cars: ${state.storedCars.length}</p>`;
    for (const [key, name, desc] of LINES) {
      const level = t[key];
      const price = CONFIG.tuning[key][level + 1];
      html += '<div class="menu-row">';
      html += `<span><b>${name} Lv ${level}</b> — ${desc}</span>`;
      if (price === undefined) {
        html += '<span class="maxed">MAX</span>';
      } else {
        html += `<button data-buy="${key}" ${state.money < price ? 'disabled' : ''}>Upgrade — $${price}</button>`;
      }
      html += '</div>';
    }
    html += '<div class="menu-row"><span><b>Store current car</b> — park it in the garage.</span><button data-act="store">Store</button></div>';
    html += '<div class="menu-row"><span><b>Spawn stored car</b> — bring one out.</span><button data-act="spawn" ' + (state.storedCars.length === 0 ? 'disabled' : '') + '>Spawn</button></div>';
    html += '<p class="menu-hint">G / Esc — close</p>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-buy]').forEach((b) => {
      b.addEventListener('click', () => buy(b.getAttribute('data-buy')));
    });
    panel.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => act(b.getAttribute('data-act')));
    });
  }

  function buy(key) {
    const level = state.tuning[key];
    const price = CONFIG.tuning[key][level + 1];
    if (price === undefined || state.money < price) return;
    state.money -= price;
    state.tuning[key] += 1;
    if (key === 'nos') state.nos = 100;
    ctx.bus.emit('toast', { text: `${key.toUpperCase()} upgraded to Lv ${state.tuning[key]}.`, kind: 'good' });
    render();
  }

  function act(kind) {
    if (kind === 'store') {
      const car = state.inCar;
      if (!car) {
        ctx.bus.emit('toast', { text: 'Drive a car in first.', kind: 'info' });
        return;
      }
      state.storedCars.push({ kind: car.kind, color: car.color, label: car.label, tuning: { ...car.tuning } });
      ctx.vehicles.removeCar(car);
      ctx.player.car = null;
      ctx.player.onFoot = true;
      ctx.player.group.visible = true;
      state.inCar = null;
      ctx.bus.emit('toast', { text: `${car.label} stored in the garage.`, kind: 'good' });
      close();
    } else if (kind === 'spawn') {
      const saved = state.storedCars.shift();
      if (!saved) return;
      const g = CONFIG.places.garage;
      const car = ctx.vehicles.spawnCar(saved.kind, g.x + 14, g.z, 0, { label: saved.label, color: saved.color });
      car.tuning = saved.tuning || { engine: 0, armor: 0, nos: 0 };
      ctx.bus.emit('toast', { text: `${saved.label} is out front.`, kind: 'good' });
      render();
    }
  }

  function openMenu() {
    if (open) return;
    open = true;
    state.paused = true;
    buildPanel();
  }

  function close() {
    if (!open) return;
    open = false;
    state.paused = false;
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  function update() {
    const input = ctx.input;
    if (open) {
      if (input.wasPressed('KeyG') || input.wasPressed('Escape')) close();
      return;
    }
    if (ctx.state.cutscene) return;
    if (nearGarage() && input.wasPressed('KeyG')) openMenu();
  }

  ctx.updaters.push(update);
  const api = { openMenu, close, update, get open() { return open; } };
  ctx.garage = api;
  return api;
}
