// SOLMAR BAY — the HUD. All DOM: money and respect, wanted stars,
// health and armor, weapon and ammo, speed, the mission tracker, the
// subtitle bar, the toast feed, a live minimap, contextual hints and
// the pause menu (P) with the job list, challenges and controls. The
// 3D modules never touch the DOM directly — they talk to the HUD
// through ctx.ui and the event bus.

import { CONFIG } from './config.js';
import { respectRank } from './state.js';

function el(tag, id, parent, cls) {
  const d = document.createElement(tag);
  if (id) d.id = id;
  if (cls) d.className = cls;
  (parent || document.body).appendChild(d);
  return d;
}

export function init(ctx) {
  const state = ctx.state;
  const hud = el('div', 'hud');
  const topLeft = el('div', 'hud-tl', hud);
  const moneyEl = el('div', 'hud-money', topLeft);
  const respectEl = el('div', 'hud-respect', topLeft);
  const respectBar = el('div', 'hud-respect-bar', topLeft);
  const respectFill = el('div', 'hud-respect-fill', respectBar);
  const clockEl = el('div', 'hud-clock', topLeft);

  const topRight = el('div', 'hud-tr', hud);
  const starsEl = el('div', 'hud-stars', topRight);
  const radioEl = el('div', 'hud-radio', topRight);

  const missionEl = el('div', 'hud-mission', hud);
  const bottomLeft = el('div', 'hud-bl', hud);
  const healthBar = el('div', 'hud-bar', bottomLeft);
  const healthFill = el('div', 'hud-health-fill', healthBar);
  const armorBar = el('div', 'hud-bar', bottomLeft);
  const armorFill = el('div', 'hud-armor-fill', armorBar);
  const bottomCenter = el('div', 'hud-bc', hud);
  const weaponEl = el('div', 'hud-weapon', bottomCenter);
  const ammoEl = el('div', 'hud-ammo', bottomCenter);
  const speedEl = el('div', 'hud-speed', bottomCenter);
  const subtitleEl = el('div', 'hud-subtitle', hud);
  const hintEl = el('div', 'hud-hint', hud);
  const toastsEl = el('div', 'hud-toasts', hud);

  const mapCanvas = el('canvas', 'hud-minimap', hud);
  mapCanvas.width = 170;
  mapCanvas.height = 170;
  const mapCtx = mapCanvas.getContext('2d');

  const pauseEl = el('div', 'pause-menu', hud);
  pauseEl.style.display = 'none';

  ctx.ui = {
    subtitle: subtitleEl,
    money: moneyEl,
    respect: respectEl,
    stars: starsEl,
    radio: radioEl,
    mission: missionEl,
    weapon: weaponEl,
    ammo: ammoEl,
    speed: speedEl,
    hint: hintEl,
    toasts: toastsEl,
    minimap: mapCanvas,
    pause: pauseEl,
  };

  let last = {};
  let mapTimer = 0;

  function toast(text, kind) {
    const t = document.createElement('div');
    t.className = `toast ${kind || 'info'}`;
    t.textContent = text;
    toastsEl.appendChild(t);
    while (toastsEl.children.length > 5) toastsEl.removeChild(toastsEl.firstChild);
    setTimeout(() => {
      t.classList.add('fade');
      setTimeout(() => t.remove(), 400);
    }, 3800);
  }

  function setText(node, key, value) {
    if (last[key] !== value) {
      last[key] = value;
      node.textContent = value;
    }
  }

  function drawMinimap() {
    const g = mapCtx;
    const S = 170;
    const toMap = (x, z) => [((x + 600) / 1200) * S, ((z + 600) / 1200) * S];
    g.fillStyle = '#101018';
    g.fillRect(0, 0, S, S);
    // Bay water on the east edge.
    g.fillStyle = '#1a5f7a';
    g.fillRect(((420 + 600) / 1200) * S, 0, S, S);
    // Roads.
    g.strokeStyle = '#3a3a44';
    g.lineWidth = 1;
    for (let x = -600; x <= 400; x += 100) {
      const [mx] = toMap(x, 0);
      g.beginPath();
      g.moveTo(mx, 0);
      g.lineTo(mx, S);
      g.stroke();
    }
    for (let z = -600; z <= 600; z += 100) {
      const [, mz] = toMap(0, z);
      g.beginPath();
      g.moveTo(0, mz);
      g.lineTo(S, mz);
      g.stroke();
    }
    // Places.
    g.fillStyle = '#ffd166';
    for (const key of Object.keys(CONFIG.places)) {
      const p = CONFIG.places[key];
      const [mx, mz] = toMap(p.x, p.z);
      g.fillRect(mx - 2, mz - 2, 4, 4);
    }
    // Mission target.
    const cur = ctx.missions.current();
    if (cur && cur.step && cur.step.target) {
      const [mx, mz] = toMap(cur.step.target.x, cur.step.target.z);
      g.fillStyle = '#ff2e88';
      g.beginPath();
      g.arc(mx, mz, 5, 0, Math.PI * 2);
      g.fill();
    }
    // Police.
    g.fillStyle = '#ff3344';
    for (const u of ctx.police.units) {
      const [mx, mz] = toMap(u.car.pos.x, u.car.pos.z);
      g.fillRect(mx - 2, mz - 2, 4, 4);
    }
    // Player.
    const [px, pz] = toMap(ctx.player.pos.x, ctx.player.pos.z);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(px, pz, 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2ec4b6';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(px, pz, 6, 0, Math.PI * 2);
    g.stroke();
  }

  function renderPause() {
    let html = '<h2>PAUSED — Solmar Bay</h2><h3>Jobs</h3><ul>';
    CONFIG.missions.forEach((m, i) => {
      const status = state.mission === -1 ? 'done' : i < state.mission ? 'done' : i === state.mission ? (state.missionActive ? 'active' : 'ready') : 'locked';
      html += `<li class="${status}">${m.id}. ${m.title} — $${m.pay} <span>${status}</span></li>`;
    });
    html += '</ul><h3>Daily challenges</h3><ul>';
    for (const c of ctx.challenges.active) {
      html += `<li>${c.text} — ${c.progress}/${c.target} ($${c.reward})</li>`;
    }
    html += '</ul><h3>Controls</h3><p>WASD drive/walk · E car · Mouse aim · 1-4 guns · R reload · Q radio · X skip cutscene · F shop · H rest · G garage · T race · Y taxi · V fence · P pause</p>';
    html += '<p class="menu-hint">P — resume</p>';
    pauseEl.innerHTML = html;
  }

  function hintText() {
    const p = ctx.player.pos;
    const near = (place, r) => Math.hypot(p.x - place.x, p.z - place.z) < r;
    if (ctx.player.onFoot) {
      const car = ctx.vehicles.nearestCar(p, 6);
      if (car) return 'E — get in the car';
    }
    if (near(CONFIG.places.mart, 16)) return 'F — shop at the MART';
    if (near(CONFIG.places.garage, 16)) return 'G — garage & tuning';
    if (near(CONFIG.places.safehouse, 14)) return 'H — rest at the safehouse';
    if (near(CONFIG.places.fence, 16)) return 'V — sell this car to the fence';
    if (near(CONFIG.places.taxiStand, 16)) return 'Y — pick up a taxi fare';
    if (near(CONFIG.places.racePad, 16)) return 'T — start a street race';
    if (near(CONFIG.places.paynspray, 14)) return 'Pay-n-Spray — drive through to lose the cops';
    return 'WASD move · E car · P jobs';
  }

  function update(dt) {
    // Pause toggling works even while paused.
    if (ctx.input.wasPressed('KeyP') && !ctx.state.cutscene) {
      state.paused = !state.paused;
      pauseEl.style.display = state.paused ? 'block' : 'none';
      if (state.paused) renderPause();
    }
    if (state.paused) return;

    setText(moneyEl, 'money', `$${state.money}`);
    const rank = respectRank(CONFIG, state);
    setText(respectEl, 'respect', `${rank.name} · ${state.respect} respect`);
    const next = ctx.respect.nextRank();
    const pct = next ? Math.min(100, ((state.respect - rank.at) / (next.at - rank.at)) * 100) : 100;
    respectFill.style.width = `${pct}%`;
    setText(clockEl, 'clock', `Day ${state.day} · ${ctx.daynight.hourLabel()}`);
    const stars = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
    setText(starsEl, 'stars', stars);
    starsEl.classList.toggle('hot', state.stars > 0);
    setText(radioEl, 'radio', `♪ ${ctx.radio.currentName()}`);
    const cur = ctx.missions.current();
    if (cur) {
      setText(missionEl, 'mission', `Job ${cur.meta.id}: ${cur.meta.title} — ${cur.step ? cur.step.text : 'done'} (${cur.stepIndex + 1}/${cur.stepCount})`);
    } else if (state.mission === -1) {
      setText(missionEl, 'mission', 'Story complete — BAY LEGEND');
    } else {
      setText(missionEl, 'mission', 'No active job — press P for the job list');
    }
    const w = CONFIG.weapons[state.weaponIndex];
    setText(weaponEl, 'weapon', w.name);
    setText(ammoEl, 'ammo', `${state.ammo[state.weaponIndex]} / ${w.mag}`);
    const speed = state.inCar ? Math.abs(state.inCar.speed) * 2.2 : ctx.player.speed * 2.2;
    setText(speedEl, 'speed', `${Math.round(speed)} mph`);
    healthFill.style.width = `${state.health}%`;
    armorFill.style.width = `${state.armor}%`;
    setText(hintEl, 'hint', hintText());
    mapTimer -= dt;
    if (mapTimer <= 0) {
      mapTimer = 0.25;
      drawMinimap();
    }
  }

  ctx.bus.on('toast', (e) => toast(e.text, e.kind));
  ctx.bus.on('ammo', (e) => setText(ammoEl, 'ammo', `${e.mag} / ${e.total}`));
  ctx.bus.on('mission-start', () => renderPause());
  ctx.bus.on('mission-complete', () => renderPause());

  ctx.updaters.push(update);
  const api = { toast, update, drawMinimap };
  ctx.hud = api;
  return api;
}
