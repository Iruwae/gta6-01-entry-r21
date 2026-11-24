// SOLMAR BAY — the player on foot and behind the wheel. WASD moves,
// Shift runs, E gets in and out of the nearest car, and the third-person
// camera rides behind the player (further back and higher while driving).
// The player object lives on ctx.player so police, missions and the HUD
// can all read the same position and heading.

import { CONFIG } from './config.js';

export function init(ctx) {
  const T = ctx.THREE;
  const state = ctx.state;

  const group = new T.Group();
  group.name = 'player';
  const jacket = new T.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.8 });
  const pants = new T.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.9 });
  const skin = new T.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.8 });
  const body = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 1.1, 8), jacket);
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new T.Mesh(new T.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 1.85;
  head.castShadow = true;
  const legL = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.9, 6), pants);
  legL.position.set(-0.2, 0.45, 0);
  const legR = legL.clone();
  legR.position.x = 0.2;
  group.add(body, head, legL, legR);
  ctx.scene.add(group);

  const start = CONFIG.player.startPos;
  const player = {
    group,
    pos: new T.Vector3(start.x, 0, start.z),
    heading: Math.PI * 0.75,
    speed: 0,
    onFoot: true,
    car: null,
    camYaw: Math.PI * 0.75 + Math.PI,
    walkPhase: 0,
  };
  ctx.player = player;
  group.position.copy(player.pos);
  let snapped = false;

  function enterCar() {
    const car = ctx.vehicles.nearestCar(player.pos, 6);
    if (!car) {
      ctx.bus.emit('toast', { text: 'No car nearby — find one on the road.', kind: 'info' });
      return;
    }
    if (car.driver === 'cop') {
      ctx.bus.emit('toast', { text: 'That one belongs to the cops.', kind: 'bad' });
      return;
    }
    ctx.vehicles.takeCar(car);
    player.car = car;
    player.onFoot = false;
    state.inCar = car;
    group.visible = false;
    ctx.bus.emit('toast', { text: `In the ${car.label}. Drive!`, kind: 'good' });
    ctx.bus.emit('entered-car', { car });
  }

  function exitCar() {
    const car = player.car;
    if (!car) return;
    const side = new T.Vector3(Math.cos(player.heading + Math.PI / 2), 0, -Math.sin(player.heading + Math.PI / 2));
    player.pos.copy(car.pos).addScaledVector(side, 3.2);
    player.pos.y = 0;
    player.car = null;
    player.onFoot = true;
    state.inCar = null;
    group.visible = true;
    group.position.copy(player.pos);
    ctx.vehicles.leaveCar(car);
    ctx.bus.emit('exited-car', { car });
  }

  function update(dt) {
    const input = ctx.input;
    if (state.paused) return;
    if (state.cutscene) return; // the cutscene module drives the camera

    // Enter / exit with E (edge-triggered).
    if (input.wasPressed('KeyE')) {
      if (player.onFoot) enterCar();
      else exitCar();
    }

    if (player.onFoot) {
      const axis = input.moveAxis();
      const run = input.running();
      const maxSpeed = run ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
      // Movement is relative to the camera yaw.
      const sin = Math.sin(player.camYaw);
      const cos = Math.cos(player.camYaw);
      const mx = axis.x * cos - axis.y * sin;
      const mz = axis.x * sin + axis.y * cos;
      const moving = Math.hypot(mx, mz) > 0.01;
      if (moving) {
        const targetHeading = Math.atan2(mx, mz);
        let dh = targetHeading - player.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        player.heading += dh * Math.min(1, dt * 10);
        player.speed = maxSpeed;
        player.walkPhase += dt * (run ? 14 : 9);
        const step = Math.sin(player.walkPhase) * 0.08;
        legL.position.y = 0.45 + Math.max(0, step);
        legR.position.y = 0.45 + Math.max(0, -step);
      } else {
        player.speed = 0;
        legL.position.y = 0.45;
        legR.position.y = 0.45;
      }
      const nx = player.pos.x + Math.sin(player.heading) * player.speed * dt;
      const nz = player.pos.z + Math.cos(player.heading) * player.speed * dt;
      if (!ctx.city.hitsBuilding(nx, player.pos.z, 0.9)) player.pos.x = nx;
      if (!ctx.city.hitsBuilding(player.pos.x, nz, 0.9)) player.pos.z = nz;
      player.pos.x = Math.max(-590, Math.min(410, player.pos.x));
      player.pos.z = Math.max(-590, Math.min(590, player.pos.z));
      group.position.copy(player.pos);
      group.rotation.y = player.heading;
      // Camera eases back behind the player; mouse drag offsets it.
      player.camYaw -= input.mouse.dx * 0.0032;
      const want = player.heading + Math.PI;
      let dy = want - player.camYaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      player.camYaw += dy * Math.min(1, dt * 1.6);
    } else if (player.car) {
      player.pos.copy(player.car.pos);
      player.heading = player.car.heading;
      player.camYaw += (player.heading + Math.PI - player.camYaw) * Math.min(1, dt * 2.2);
    }

    // Camera follow. Snap on the first frame so the opening shot is
    // already framed (software rendering runs at ~1fps headless, and a
    // slow lerp would leave the camera mid-flight in screenshots).
    const cam = ctx.camera;
    const dist = player.onFoot ? 9 : 13;
    const height = player.onFoot ? 4.2 : 5.4;
    const cx = player.pos.x + Math.sin(player.camYaw) * dist;
    const cz = player.pos.z + Math.cos(player.camYaw) * dist;
    if (!snapped) {
      cam.position.set(cx, height, cz);
      snapped = true;
    } else {
      cam.position.lerp(new T.Vector3(cx, height, cz), Math.min(1, dt * 6));
    }
    cam.lookAt(player.pos.x, player.onFoot ? 1.6 : 1.2, player.pos.z);
  }

  ctx.updaters.push(update);
  return player;
}
