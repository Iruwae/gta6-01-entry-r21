// SOLMAR BAY — the police. A utility brain scores four behaviours per
// unit every couple of seconds and runs the winner: RAMMING (hit the
// player at speed), ROADBLOCK (park ahead and wait), PURSUIT (chase the
// bumper) and SEARCH (sweep the last known spot). Unit count scales
// with the wanted level; at 3+ stars the helicopter joins in. Getting
// caught on foot means a bust: a fine, a trip to the safehouse, and a
// clean slate.

import { damagePlayer, setStars } from './state.js';

const MODES = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SEARCH'];

export function init(ctx) {
  const T = ctx.THREE;
  const state = ctx.state;
  const units = [];
  const group = new T.Group();
  group.name = 'police';
  ctx.scene.add(group);

  let brainTimer = 0;
  let bustTimer = 0;
  let lastKnown = new T.Vector3();

  function makeLightbar(car) {
    const bar = new T.Mesh(
      new T.BoxGeometry(1.1, 0.22, 0.4),
      new T.MeshStandardMaterial({ color: 0x111122, emissive: 0x3344ff, emissiveIntensity: 2 }),
    );
    bar.position.set(0, 1.68, -0.3);
    car.mesh.add(bar);
    car.lightbar = bar;
    return bar;
  }

  function spawnUnit() {
    const p = ctx.city.randomRoadPoint();
    const car = ctx.vehicles.spawnCar('sedan', p.x, p.z, 0, { label: 'police cruiser', color: 0x111111, driver: 'cop' });
    makeLightbar(car);
    const unit = {
      car,
      mode: 'PURSUIT',
      hp: 100,
      flash: 0,
      stuck: 0,
      ramCd: 0,
    };
    units.push(unit);
    return unit;
  }

  function desiredUnits() {
    return [0, 2, 3, 4, 5, 6][state.stars] || 0;
  }

  function scoreModes(unit) {
    const player = ctx.player;
    const d = unit.car.pos.distanceTo(player.pos);
    const pSpeed = player.car ? Math.abs(player.car.speed) : player.speed;
    const scores = {
      PURSUIT: 50 - d * 0.4,
      RAMMING: pSpeed > 14 && d < 45 ? 70 : 10,
      ROADBLOCK: state.stars >= 2 && d > 30 && d < 90 ? 65 : 5,
      SEARCH: d > 80 ? 60 : 8,
    };
    return scores;
  }

  function pickMode(unit) {
    const scores = scoreModes(unit);
    let best = 'PURSUIT';
    let bestScore = -Infinity;
    for (const m of MODES) {
      if (scores[m] > bestScore) {
        bestScore = scores[m];
        best = m;
      }
    }
    unit.mode = best;
  }

  function steerToward(car, target, dt, topSpeed) {
    const dx = target.x - car.pos.x;
    const dz = target.z - car.pos.z;
    const want = Math.atan2(dx, dz);
    let dh = want - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh * 2.4 * dt));
    car.speed += (topSpeed - car.speed) * Math.min(1, dt * 0.9);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
  }

  function updateUnit(unit, dt) {
    const car = unit.car;
    const player = ctx.player;
    unit.flash += dt * 9;
    if (car.lightbar) {
      car.lightbar.material.emissive.setHex(Math.sin(unit.flash) > 0 ? 0xff2222 : 0x2244ff);
    }
    const d = car.pos.distanceTo(player.pos);
    unit.ramCd = Math.max(0, unit.ramCd - dt);
    if (unit.mode === 'PURSUIT' || unit.mode === 'RAMMING') {
      const lead = unit.mode === 'RAMMING' ? 0.55 : 0.15;
      const pv = player.car
        ? new T.Vector3(Math.sin(player.car.heading), 0, Math.cos(player.car.heading)).multiplyScalar(player.car.speed * lead)
        : new T.Vector3();
      steerToward(car, { x: player.pos.x + pv.x, z: player.pos.z + pv.z }, dt, unit.mode === 'RAMMING' ? 40 : 34);
    } else if (unit.mode === 'ROADBLOCK') {
      // Park across the road ahead of the player.
      const ahead = new T.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading)).multiplyScalar(26);
      const spot = { x: player.pos.x + ahead.x, z: player.pos.z + ahead.z };
      if (car.pos.distanceTo(new T.Vector3(spot.x, 0, spot.z)) > 6) {
        steerToward(car, spot, dt, 26);
      } else {
        car.speed = 0;
        car.heading += dt * 0.4;
        car.mesh.rotation.y = car.heading;
      }
    } else {
      // SEARCH: sweep around the last known position.
      const t = ctx.clock.elapsedTime * 0.25 + units.indexOf(unit);
      const spot = { x: lastKnown.x + Math.cos(t) * 34, z: lastKnown.z + Math.sin(t) * 34 };
      steerToward(car, spot, dt, 20);
    }
    // Ramming contact hurts — at most once every 1.2s per unit.
    if (d < 3.4 && unit.ramCd <= 0) {
      const impact = Math.abs(car.speed);
      if (impact > 4) {
        unit.ramCd = 1.2;
        damagePlayer(state, Math.min(22, 4 + impact * 0.4));
        ctx.bus.emit('shake', { amount: 0.5 });
        ctx.bus.emit('crash', { speed: impact });
        car.speed *= -0.3;
        if (player.car) player.car.speed *= 0.6;
      }
    }
    // Unit destroyed?
    if (unit.hp <= 0) {
      ctx.bus.emit('explosion', { pos: car.pos.clone() });
      ctx.bus.emit('toast', { text: 'Cruiser down! +40 respect.', kind: 'good' });
      ctx.state.respect += 40;
      ctx.heat.addHeat(1, 'cruiser destroyed');
      ctx.vehicles.removeCar(car);
      units.splice(units.indexOf(unit), 1);
    }
  }

  function canSeePlayer() {
    for (const u of units) {
      if (u.car.pos.distanceTo(ctx.player.pos) < 45) return true;
    }
    return false;
  }

  function update(dt) {
    if (state.paused) return;
    // Keep the unit count matched to the wanted level.
    const want = desiredUnits();
    while (units.length < want) spawnUnit();
    while (units.length > want) {
      const u = units.pop();
      ctx.vehicles.removeCar(u.car);
    }
    brainTimer -= dt;
    if (brainTimer <= 0) {
      brainTimer = 2;
      lastKnown.copy(ctx.player.pos);
      for (const u of units) pickMode(u);
    }
    for (const u of [...units]) updateUnit(u, dt);
    // Busted: on foot, slow, and a unit right on top of you.
    if (state.stars > 0 && ctx.player.onFoot) {
      const close = units.some((u) => u.car.pos.distanceTo(ctx.player.pos) < 3.2);
      if (close && ctx.player.speed < 1) {
        bustTimer += dt;
        if (bustTimer > 2.5) {
          bustTimer = 0;
          const fine = Math.min(state.money, 150);
          state.money -= fine;
          setStars(state, 0);
          state.stats.arrests += 1;
          const sh = ctx.config.places.safehouse;
          ctx.player.pos.set(sh.x, 0, sh.z);
          ctx.bus.emit('toast', { text: `BUSTED! Fined $${fine}. Woke up at the safehouse.`, kind: 'bad' });
          ctx.bus.emit('busted', { fine });
        }
      } else {
        bustTimer = 0;
      }
    }
  }

  ctx.updaters.push(update);
  const api = { units, spawnUnit, canSeePlayer, update, desiredUnits };
  ctx.police = api;
  return api;
}
