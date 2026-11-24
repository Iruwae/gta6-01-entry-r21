// SOLMAR BAY — cars, traffic and driving. Cars are built from boxes,
// cylinders and emissive lights, no imported models. Traffic follows the
// road grid on looping routes; the player's car is simple arcade
// physics (throttle, brake, steering that bites harder at speed, NOS
// boost). A car remembers its value so the fence can price it.

import { range, pick } from './random.js';
import { CONFIG } from './config.js';

const CAR_COLORS = [0xd64545, 0x4a90d9, 0xf2c14e, 0x7fb069, 0xe8e8e8, 0x222222, 0x9b5de5, 0xf15bb5];
const CAR_LABELS = ['sedan', 'coupe', 'sport', 'taxi', 'van', 'pickup'];

export function init(ctx) {
  const T = ctx.THREE;
  const rng = ctx.rng;
  const state = ctx.state;

  const cars = [];
  const traffic = [];
  const group = new T.Group();
  group.name = 'vehicles';
  ctx.scene.add(group);

  const wheelGeo = new T.CylinderGeometry(0.42, 0.42, 0.32, 10);
  const wheelMat = new T.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const lightMat = new T.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 1.4 });
  const tailMat = new T.MeshStandardMaterial({ color: 0xaa1122, emissive: 0xdd1122, emissiveIntensity: 0.9 });

  function buildCarMesh(color, kind) {
    const g = new T.Group();
    const bodyMat = new T.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
    const long = kind === 'van' ? 5.4 : 4.4;
    const body = new T.Mesh(new T.BoxGeometry(2, 0.75, long), bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    g.add(body);
    const cabin = new T.Mesh(
      new T.BoxGeometry(1.7, 0.62, kind === 'van' ? 4.6 : 2.2),
      new T.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.15, metalness: 0.7 }),
    );
    cabin.position.set(0, 1.28, kind === 'van' ? 0 : -0.3);
    cabin.castShadow = true;
    g.add(cabin);
    const wheelY = 0.42;
    const wz = long / 2 - 0.85;
    for (const [wx, wz2] of [[-0.95, wz], [0.95, wz], [-0.95, -wz], [0.95, -wz]]) {
      const w = new T.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wheelY, wz2);
      g.add(w);
    }
    const hl = new T.Mesh(new T.BoxGeometry(1.5, 0.22, 0.12), lightMat);
    hl.position.set(0, 0.7, long / 2 + 0.02);
    g.add(hl);
    const tl = new T.Mesh(new T.BoxGeometry(1.5, 0.22, 0.12), tailMat);
    tl.position.set(0, 0.7, -long / 2 - 0.02);
    g.add(tl);
    if (kind === 'taxi') {
      const sign = new T.Mesh(
        new T.BoxGeometry(0.9, 0.28, 0.5),
        new T.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffc233, emissiveIntensity: 1.2 }),
      );
      sign.position.set(0, 1.75, -0.3);
      g.add(sign);
    }
    return g;
  }

  function spawnCar(kind, x, z, heading, opts = {}) {
    const color = opts.color ?? (kind === 'taxi' ? 0xf2c14e : pick(rng, CAR_COLORS));
    const label = opts.label ?? kind;
    const mesh = buildCarMesh(color, kind);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    group.add(mesh);
    const car = {
      mesh,
      kind,
      label,
      color,
      pos: new T.Vector3(x, 0, z),
      heading,
      speed: 0,
      maxSpeed: kind === 'sport' ? 46 : kind === 'taxi' ? 34 : 30,
      value: kind === 'sport' ? 1400 : kind === 'van' ? 500 : 700,
      driver: opts.driver ?? null, // 'traffic' | 'cop' | 'player' | null
      route: opts.route ?? null,
      tuning: { engine: 0, armor: 0, nos: 0 },
    };
    cars.push(car);
    return car;
  }

  function removeCar(car) {
    group.remove(car.mesh);
    const i = cars.indexOf(car);
    if (i >= 0) cars.splice(i, 1);
    const t = traffic.indexOf(car);
    if (t >= 0) traffic.splice(t, 1);
  }

  // --- traffic: cars that loop along one road, wrapping at the edge ---
  function spawnTraffic(n) {
    for (let i = 0; i < n; i++) {
      const p = ctx.city.randomRoadPoint();
      const vertical = Math.abs(p.x % 100) < 1;
      const heading = vertical ? (rng() < 0.5 ? 0 : Math.PI) : rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      const kind = pick(rng, ['sedan', 'coupe', 'van', 'taxi']);
      const car = spawnCar(kind, p.x, p.z, heading, { driver: 'traffic' });
      car.speed = range(rng, 8, 14);
      car.route = { vertical, dir: heading };
      traffic.push(car);
    }
  }

  function updateTraffic(dt) {
    for (const car of traffic) {
      if (car.driver !== 'traffic') continue;
      const ahead = car.speed * 2.2;
      let blocked = false;
      for (const other of cars) {
        if (other === car) continue;
        const dx = other.pos.x - car.pos.x;
        const dz = other.pos.z - car.pos.z;
        const along = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
        const side = Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz);
        if (along > 0 && along < ahead && side < 3) {
          blocked = true;
          break;
        }
      }
      const target = blocked ? 0 : 11;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      if (car.pos.x > 400) car.pos.x = -590;
      if (car.pos.x < -590) car.pos.x = 400;
      if (car.pos.z > 590) car.pos.z = -590;
      if (car.pos.z < -590) car.pos.z = 590;
      car.mesh.position.copy(car.pos);
    }
  }

  // --- player driving ---
  function drivePlayer(dt) {
    const car = state.inCar;
    if (!car) return;
    const input = ctx.input;
    const axis = input.moveAxis();
    const tuning = car.tuning || { engine: 0, nos: 0 };
    const top = car.maxSpeed * (1 + tuning.engine * 0.12);
    const accel = 16 + tuning.engine * 4;
    const boosting = input.isDown('ShiftLeft') && state.nos > 0 && axis.y > 0;
    if (boosting) state.nos = Math.max(0, state.nos - dt * 30);
    if (axis.y > 0) car.speed += accel * (boosting ? 1.9 : 1) * dt;
    else if (axis.y < 0) car.speed -= (car.speed > 0 ? 26 : 10) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
    car.speed = Math.max(-12, Math.min(top, car.speed));
    const steer = axis.x * (0.028 + Math.min(0.05, Math.abs(car.speed) * 0.0012));
    car.heading -= steer * Math.sign(car.speed || 1) * (Math.abs(car.speed) > 0.5 ? 1 : 0);
    const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
    if (ctx.city.hitsBuilding(nx, car.pos.z, 2.2) || nx > 410 || nx < -590) {
      car.speed *= -0.25;
      ctx.bus.emit('crash', { speed: Math.abs(car.speed) });
    } else {
      car.pos.x = nx;
    }
    if (ctx.city.hitsBuilding(car.pos.x, nz, 2.2) || nz > 590 || nz < -590) {
      car.speed *= -0.25;
      ctx.bus.emit('crash', { speed: Math.abs(car.speed) });
    } else {
      car.pos.z = nz;
    }
    state.distanceDriven += Math.abs(car.speed) * dt;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    if (boosting) ctx.bus.emit('nos', { car });
  }

  function nearestCar(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (car.driver === 'player') continue;
      const d = car.pos.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function takeCar(car) {
    car.driver = 'player';
    const ti = traffic.indexOf(car);
    if (ti >= 0) traffic.splice(ti, 1);
    car.tuning = { ...state.tuning, nos: state.nos };
    // Headlights: a real spotlight so the road ahead is lit at night.
    if (!car.headlight) {
      const spot = new T.SpotLight(0xfff2c0, 90, 70, 0.55, 0.45, 1.1);
      spot.position.set(0, 1.1, 2.2);
      const target = new T.Object3D();
      target.position.set(0, 0, 26);
      car.mesh.add(target);
      spot.target = target;
      car.mesh.add(spot);
      car.headlight = spot;
      car.headlightTarget = target;
    }
  }

  function leaveCar(car) {
    car.driver = null;
  }

  function update(dt) {
    if (state.paused) return;
    updateTraffic(dt);
    drivePlayer(dt);
    // Traffic respawn keeps the streets alive.
    if (traffic.length < 12 && rng() < dt * 0.2) {
      const p = ctx.city.randomRoadPoint();
      const car = spawnCar(pick(rng, ['sedan', 'coupe', 'van']), p.x, p.z, rng() * Math.PI * 2, { driver: 'traffic' });
      car.speed = 11;
      traffic.push(car);
    }
  }

  spawnTraffic(14);
  // The player's first ride: Vic's old sedan, parked by the start.
  const starter = spawnCar('sedan', CONFIG.player.startPos.x + 10, CONFIG.player.startPos.z - 12, 0.6, { label: "Vic's sedan", color: 0x4a90d9 });

  ctx.updaters.push(update);
  const api = { cars, traffic, spawnCar, removeCar, nearestCar, takeCar, leaveCar, group, starter };
  ctx.vehicles = api;
  return api;
}
