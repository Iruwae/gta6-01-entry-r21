// SOLMAR BAY — the corner store. Press F near the MART to shop: snacks
// that heal, ammo, armor and NOS refills, priced from the config. The
// panel is plain DOM; buying applies the effect immediately and the
// panel re-renders so the player sees the new cash total.

import { CONFIG } from './config.js';
import { healPlayer } from './state.js';

export function init(ctx) {
  const state = ctx.state;
  let open = false;
  let panel = null;

  function nearMart() {
    const m = CONFIG.places.mart;
    const p = ctx.player.pos;
    return Math.hypot(p.x - m.x, p.z - m.z) < 16;
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'shop-panel';
    panel.className = 'menu-panel';
    document.body.appendChild(panel);
    render();
  }

  function render() {
    if (!panel) return;
    let html = '<h2>MART — Corner Store</h2>';
    html += `<p class="menu-money">Cash: $${state.money} &nbsp;·&nbsp; Health: ${Math.round(state.health)} &nbsp;·&nbsp; Armor: ${Math.round(state.armor)}</p>`;
    for (let i = 0; i < CONFIG.shopItems.length; i++) {
      const item = CONFIG.shopItems[i];
      html += '<div class="menu-row">';
      html += `<span><b>${item.name}</b> — ${item.desc}</span>`;
      html += `<button data-buy="${i}" ${state.money < item.price ? 'disabled' : ''}>$${item.price}</button>`;
      html += '</div>';
    }
    html += '<p class="menu-hint">F / Esc — close</p>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-buy]').forEach((b) => {
      b.addEventListener('click', () => buy(parseInt(b.getAttribute('data-buy'), 10)));
    });
  }

  function buy(i) {
    const item = CONFIG.shopItems[i];
    if (!item || state.money < item.price) return;
    state.money -= item.price;
    if (item.heal) healPlayer(state, item.heal);
    if (item.ammo) {
      const wi = CONFIG.weapons.findIndex((w) => w.name === item.ammo);
      if (wi >= 0) state.ammo[wi] += item.amount;
    }
    if (item.armor) state.armor = Math.min(100, state.armor + item.armor);
    if (item.nos) state.nos = 100;
    ctx.bus.emit('pickup', {});
    ctx.bus.emit('toast', { text: `Bought ${item.name}.`, kind: 'good' });
    render();
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
      if (input.wasPressed('KeyF') || input.wasPressed('Escape')) close();
      return;
    }
    if (ctx.state.cutscene) return;
    if (nearMart() && input.wasPressed('KeyF')) openMenu();
  }

  ctx.updaters.push(update);
  const api = { openMenu, close, update, get open() { return open; } };
  ctx.shop = api;
  return api;
}
