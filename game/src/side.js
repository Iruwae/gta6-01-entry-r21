// SOLMAR BAY — side hustles. Three ways to make money outside the
// story: street races from the race pad (T), taxi fares from the stand
// (Y), and collectible packages glowing around the city. Races and
// fares are timed; packages are patient. All three feed the daily
// challenges and the respect ladder.

import { CONFIG } from './config.js';
import { addMoney, addRespect } from './state.js';
import { range, pick } from './random.js';

const RACE_GATES = [
  { x: 0, z: -200 },
  { x: 0, z: 200 },
  { x: 200, z: 200 },
  { x: 200, z: -200 },
];

export function init(ctx) {
  const T = ctx.THREE;
  const state = ctx.state;
  const rng = ctx.rng;

  // --- packages ---
  const packages = [];
  const pkgGeo = new T.BoxGeometry(1.4, 1.4, 1.4);
  const pkgMat = new T.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffc233, emissiveIntensity: 1.6 });

  function spawnPackage(x, z) {
    const m = new T.Mesh(pkgGeo, pkgMat);
    m.position.set(x, 1.2, z);
    m.castShadow = true;
    ctx.scene.add(m);
    const pkg = { mesh: m, x, z, spin: rng() * Math.PI * 2 };
    packages.push(pkg);
    return pkg;
  }

  function spawnPackages(n) {
    for (let i = 0; i < n; i++) {
      const p = ctx.city.randomLandPoint();
      spawnPackage(p.x, p.z);
    }
  }

  for (let i = 0; i < 10; i++) {
    const p = ctx.city.randomLandPoint();
    spawnPackage(p.x, p.z);
  }

  // --- street races ---
  let race = null;
  const gateMeshes = [];
  const gateMat = new T.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false });
  for (let i = 0; i < RACE_GATES.length; i++) {
    const g = new T.Mesh(new T.CylinderGeometry(6, 6, 26, 12, 1, true), gateMat.clone());
    g.position.set(RACE_GATES[i].x, 13, RACE_GATES[i].z);
    g.visible = false;
    ctx.scene.add(g);
    gateMeshes.push(g);
  }

  function startRace() {
    if (race) return;
    const pad = CONFIG.places.racePad;
    if (Math.hypot(ctx.player.pos.x - pad.x, ctx.player.pos.z - pad.z) > 16) {
      ctx.bus.emit('toast', { text: 'Go to the race pad to start a street race.', kind: 'info' });
      return;
    }
    race = { gate: 0, timer: 100 };
    gateMeshes.forEach((g, i) => { g.visible = i === 0; });
    ctx.dialogue.say('Lena Cruz', 'Four gates, a hundred seconds. Show the Mile what you have.', 4);
    ctx.bus.emit('toast', { text: 'Street race started! Hit the pink gates in order.', kind: 'good' });
  }

  function endRace(won) {
    race = null;
    gateMeshes.forEach((g) => { g.visible = false; });
    if (won) {
      state.racesWon += 1;
      addMoney(state, 500);
      addRespect(state, 80);
      ctx.bus.emit('toast', { text: 'Race won! +$500, +80 respect.', kind: 'good' });
      ctx.bus.emit('challenge-progress', { kind: 'race', amount: 1 });
    } else {
      ctx.bus.emit('toast', { text: 'Race lost. The Mile keeps its crown — for now.', kind: 'bad' });
    }
  }

  // --- taxi fares ---
  let fare = null;
  let passenger = null;
  const fareMarker = new T.Mesh(
    new T.CylinderGeometry(3, 3, 30, 10, 1, true),
    new T.MeshBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false }),
  );
  fareMarker.visible = false;
  ctx.scene.add(fareMarker);

  function startFare() {
    if (fare) return;
    const stand = CONFIG.places.taxiStand;
    if (Math.hypot(ctx.player.pos.x - stand.x, ctx.player.pos.z - stand.z) > 16) {
      ctx.bus.emit('toast', { text: 'Go to the taxi stand to pick up a fare.', kind: 'info' });
      return;
    }
    const dest = ctx.city.randomRoadPoint();
    const dist = Math.hypot(dest.x - stand.x, dest.z - stand.z);
    const pay = Math.round(60 + dist * 0.12);
    fare = { dest, timer: 75, pay };
    fareMarker.position.set(dest.x, 15, dest.z);
    fareMarker.visible = true;
    // The passenger climbs in (a simple figure in the back seat).
    passenger = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.36, 0.42, 0.95, 7), new T.MeshStandardMaterial({ color: pick(rng, [0xe07a5f, 0x4cc9f0, 0x9b5de5]) }));
    body.position.y = 0.95;
    const head = new T.Mesh(new T.SphereGeometry(0.26, 8, 7), new T.MeshStandardMaterial({ color: 0xc98a5e }));
    head.position.y = 1.6;
    passenger.add(body, head);
    passenger.position.set(stand.x, 0, stand.z);
    ctx.scene.add(passenger);
    ctx.dialogue.say('Passenger', 'Step on it — I am late for the marina!', 3.5);
    ctx.bus.emit('toast', { text: `Fare started — $${pay} if you make it in time.`, kind: 'good' });
  }

  function endFare(done) {
    if (passenger) {
      ctx.scene.remove(passenger);
      passenger = null;
    }
    fareMarker.visible = false;
    if (done && fare) {
      state.faresDone += 1;
      addMoney(state, fare.pay);
      addRespect(state, 15);
      ctx.bus.emit('pickup', {});
      ctx.bus.emit('toast', { text: `Fare complete! +$${fare.pay}.`, kind: 'good' });
      ctx.bus.emit('challenge-progress', { kind: 'fares', amount: 1 });
    } else if (fare) {
      ctx.bus.emit('toast', { text: 'Fare lost — the passenger walked away.', kind: 'bad' });
    }
    fare = null;
  }

  function update(dt) {
    if (ctx.state.paused || ctx.state.cutscene) return;
    const input = ctx.input;
    const pad = CONFIG.places.racePad;
    const stand = CONFIG.places.taxiStand;
    if (input.wasPressed('KeyT') && Math.hypot(ctx.player.pos.x - pad.x, ctx.player.pos.z - pad.z) < 16) startRace();
    if (input.wasPressed('KeyY') && Math.hypot(ctx.player.pos.x - stand.x, ctx.player.pos.z - stand.z) < 16) startFare();

    // Packages: spin, bob, collect on touch.
    for (let i = packages.length - 1; i >= 0; i--) {
      const p = packages[i];
      p.spin += dt * 1.5;
      p.mesh.rotation.y = p.spin;
      p.mesh.position.y = 1.2 + Math.sin(ctx.clock.elapsedTime * 2 + p.spin) * 0.25;
      if (ctx.player.pos.distanceTo(p.mesh.position) < 3.5) {
        ctx.scene.remove(p.mesh);
        packages.splice(i, 1);
        state.packagesCollected += 1;
        addMoney(state, 40);
        addRespect(state, 10);
        ctx.bus.emit('pickup', {});
        ctx.bus.emit('toast', { text: `Package found! +$40, +10 respect. (${state.packagesCollected} total)`, kind: 'good' });
      }
    }

    // Race progress.
    if (race) {
      race.timer -= dt;
      const g = RACE_GATES[race.gate];
      if (Math.hypot(ctx.player.pos.x - g.x, ctx.player.pos.z - g.z) < 12) {
        race.gate += 1;
        ctx.bus.emit('pickup', {});
        if (race.gate >= RACE_GATES.length) {
          endRace(true);
        } else {
          gateMeshes.forEach((m, i) => { m.visible = i === race.gate; });
        }
      } else if (race.timer <= 0) {
        endRace(false);
      }
    }

    // Fare progress.
    if (fare) {
      fare.timer -= dt;
      if (passenger && state.inCar) {
        passenger.position.copy(state.inCar.pos);
        passenger.position.y = 0.3;
      }
      if (Math.hypot(ctx.player.pos.x - fare.dest.x, ctx.player.pos.z - fare.dest.z) < 10) {
        endFare(true);
      } else if (fare.timer <= 0) {
        endFare(false);
      }
    }
  }

  ctx.updaters.push(update);
  const api = { packages, spawnPackages, startRace, startFare, update, get race() { return race; }, get fare() { return fare; } };
  ctx.side = api;
  return api;
}
