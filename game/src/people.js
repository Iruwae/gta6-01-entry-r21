// SOLMAR BAY — pedestrians and gulls. Walkers stroll the sidewalks and
// cross at intersections; gulls circle the bay and the marina. Both are
// cheap: a handful of meshes each, wandering on simple rules, there to
// make the city feel lived in rather than to be simulated deeply.

import { range, pick } from './random.js';

const SHIRTS = [0xe07a5f, 0x4cc9f0, 0xf2c14e, 0x9b5de5, 0x80b918, 0xe8e8e8, 0x222222];
const NAMES = ['Marisol', 'Dee', 'Rico', 'Tanya', 'Old Man Gus', 'Priya', 'Marco', 'Luz', 'Benny', 'Sofia'];

export function init(ctx) {
  const T = ctx.THREE;
  const rng = ctx.rng;
  const group = new T.Group();
  group.name = 'people';
  ctx.scene.add(group);

  const bodyGeo = new T.CylinderGeometry(0.32, 0.38, 0.95, 7);
  const headGeo = new T.SphereGeometry(0.26, 8, 7);
  const skinMat = new T.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.8 });

  const pedestrians = [];
  for (let i = 0; i < 22; i++) {
    const shirt = new T.MeshStandardMaterial({ color: pick(rng, SHIRTS), roughness: 0.85 });
    const p = new T.Group();
    const body = new T.Mesh(bodyGeo, shirt);
    body.position.y = 0.95;
    body.castShadow = true;
    const head = new T.Mesh(headGeo, skinMat);
    head.position.y = 1.62;
    p.add(body, head);
    const start = ctx.city.randomLandPoint();
    p.position.set(start.x, 0, start.z);
    group.add(p);
    pedestrians.push({
      group: p,
      name: pick(rng, NAMES),
      pos: p.position,
      heading: rng() * Math.PI * 2,
      speed: range(rng, 1.2, 2.6),
      target: null,
      wait: range(rng, 0, 4),
    });
  }

  // Gulls over the bay: two flapping wings each, circling the marina.
  const gulls = [];
  const wingGeo = new T.PlaneGeometry(1.6, 0.45);
  const gullMat = new T.MeshBasicMaterial({ color: 0xf2f2ea, side: T.DoubleSide });
  for (let i = 0; i < 10; i++) {
    const g = new T.Group();
    const wl = new T.Mesh(wingGeo, gullMat);
    wl.position.x = -0.8;
    const wr = new T.Mesh(wingGeo, gullMat);
    wr.position.x = 0.8;
    g.add(wl, wr);
    group.add(g);
    gulls.push({
      group: g,
      wingL: wl,
      wingR: wr,
      angle: rng() * Math.PI * 2,
      radius: range(rng, 30, 120),
      height: range(rng, 26, 60),
      speed: range(rng, 0.1, 0.3),
      cx: 400,
      cz: range(rng, -400, 400),
      phase: rng() * Math.PI * 2,
    });
  }

  function updatePedestrians(dt) {
    for (const p of pedestrians) {
      if (p.wait > 0) {
        p.wait -= dt;
        continue;
      }
      if (!p.target) {
        const t = ctx.city.randomLandPoint();
        p.target = t;
        p.heading = Math.atan2(t.x - p.pos.x, t.z - p.pos.z);
      }
      const dx = p.target.x - p.pos.x;
      const dz = p.target.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        p.target = null;
        p.wait = range(rng, 1, 6);
        continue;
      }
      p.heading = Math.atan2(dx, dz);
      p.pos.x += Math.sin(p.heading) * p.speed * dt;
      p.pos.z += Math.cos(p.heading) * p.speed * dt;
      p.group.rotation.y = p.heading;
      p.group.position.y = Math.abs(Math.sin(ctx.clock.elapsedTime * 6 + p.speed)) * 0.05;
    }
  }

  function updateGulls(dt) {
    for (const g of gulls) {
      g.angle += g.speed * dt;
      g.phase += dt * 7;
      const flap = Math.sin(g.phase) * 0.5;
      g.wingL.rotation.z = flap;
      g.wingR.rotation.z = -flap;
      g.group.position.set(
        g.cx + Math.cos(g.angle) * g.radius,
        g.height + Math.sin(g.phase * 0.5) * 2,
        g.cz + Math.sin(g.angle) * g.radius,
      );
      g.group.rotation.y = -g.angle;
    }
  }

  function update(dt) {
    if (ctx.state.paused) return;
    updatePedestrians(dt);
    updateGulls(dt);
  }

  ctx.updaters.push(update);
  const api = { pedestrians, gulls, group };
  ctx.people = api;
  return api;
}
