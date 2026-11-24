// SOLMAR BAY — weapons. Four guns on keys 1-4, mouse to aim, click to
// fire, R to reload. Hitscan with a cone check against police cruisers
// and pedestrians: the nearest target inside the aim cone and range
// takes the hit. Shooting a pedestrian is a crime — the heat notices.

import { CONFIG } from './config.js';

export function init(ctx) {
  const T = ctx.THREE;
  const state = ctx.state;
  let cooldown = 0;
  let reloading = 0;
  let flashLight = null;

  function current() {
    return CONFIG.weapons[state.weaponIndex];
  }

  function switchTo(i) {
    if (i < 0 || i >= CONFIG.weapons.length) return;
    state.weaponIndex = i;
    reloading = 0;
    ctx.bus.emit('toast', { text: `${current().name} ready.`, kind: 'info' });
    ctx.bus.emit('ammo', { weapon: current().name, mag: state.ammo[i], total: current().mag });
  }

  function startReload() {
    const w = current();
    if (reloading > 0 || state.ammo[state.weaponIndex] === w.mag) return;
    reloading = 1.0;
    ctx.bus.emit('toast', { text: `Reloading ${w.name}…`, kind: 'info' });
  }

  // Ray from the camera through the mouse cursor, tested against a list
  // of sphere targets. Returns the closest hit inside the cone, if any.
  function pickTarget(origin, dir, targets, range, spread) {
    let best = null;
    let bestD = range;
    for (const t of targets) {
      const to = new T.Vector3().subVectors(t.pos, origin);
      const d = to.length();
      if (d > range || d < 1) continue;
      const cos = to.normalize().dot(dir);
      if (cos < 1 - spread * 2.2) continue;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best ? { target: best, dist: bestD } : null;
  }

  function fire() {
    const w = current();
    if (cooldown > 0 || reloading > 0) return;
    if (state.ammo[state.weaponIndex] <= 0) {
      startReload();
      return;
    }
    cooldown = w.rate;
    state.ammo[state.weaponIndex] -= 1;
    state.stats.shots += 1;
    const cam = ctx.camera;
    const ndc = new T.Vector2(
      (ctx.input.mouse.x / window.innerWidth) * 2 - 1,
      -(ctx.input.mouse.y / window.innerHeight) * 2 + 1,
    );
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, cam);
    const origin = ray.ray.origin.clone();
    const dir = ray.ray.direction.clone();

    const targets = [];
    for (const u of ctx.police.units) {
      targets.push({ pos: u.car.pos, kind: 'cop', unit: u, radius: 3 });
    }
    for (const p of ctx.people.pedestrians) {
      targets.push({ pos: p.pos, kind: 'ped', ped: p, radius: 1.2 });
    }
    const pellets = w.pellets || 1;
    let hitAny = false;
    for (let i = 0; i < pellets; i++) {
      const jittered = dir.clone();
      jittered.x += (ctx.rng() - 0.5) * w.spread * 2;
      jittered.y += (ctx.rng() - 0.5) * w.spread * 2;
      jittered.normalize();
      const hit = pickTarget(origin, jittered, targets, w.range, w.spread);
      if (!hit) continue;
      hitAny = true;
      state.stats.hits += 1;
      if (hit.target.kind === 'cop') {
        hit.target.unit.hp -= w.damage;
        ctx.bus.emit('hitmark', { pos: hit.target.pos.clone() });
        if (hit.target.unit.hp <= 0) state.kills += 1;
      } else {
        ctx.heat.addHeat(1, 'shot a pedestrian');
        ctx.bus.emit('toast', { text: 'You shot a civilian! The cops are coming.', kind: 'bad' });
      }
    }
    // Muzzle flash: a brief point light at the player + a tracer line.
    if (!flashLight) {
      flashLight = new T.PointLight(0xffc866, 0, 18, 1.6);
      ctx.scene.add(flashLight);
    }
    flashLight.position.copy(ctx.player.pos).y += 1.6;
    flashLight.intensity = 26;
    ctx.bus.emit('shake', { amount: 0.12 });
    ctx.bus.emit('gunshot', { weapon: w.name });
    ctx.bus.emit('ammo', { weapon: w.name, mag: state.ammo[state.weaponIndex], total: w.mag });
    if (state.ammo[state.weaponIndex] === 0) startReload();
  }

  function update(dt) {
    if (state.paused) return;
    cooldown = Math.max(0, cooldown - dt);
    if (flashLight) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 220);
    if (reloading > 0) {
      reloading -= dt;
      if (reloading <= 0) {
        const w = current();
        state.ammo[state.weaponIndex] = w.mag;
        ctx.bus.emit('ammo', { weapon: w.name, mag: w.mag, total: w.mag });
      }
    }
    const input = ctx.input;
    if (input.wasPressed('Digit1')) switchTo(0);
    if (input.wasPressed('Digit2')) switchTo(1);
    if (input.wasPressed('Digit3')) switchTo(2);
    if (input.wasPressed('Digit4')) switchTo(3);
    if (input.wasPressed('KeyR')) startReload();
    if (input.mouse.down || input.mouse.clicked) fire();
  }

  ctx.updaters.push(update);
  const api = { current, switchTo, startReload, fire, update };
  ctx.weapons = api;
  return api;
}
