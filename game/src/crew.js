// SOLMAR BAY — Lena Cruz, getaway driver and the crew of one. On foot
// she walks beside the player; in a car during the crew mission she
// rides shotgun and keeps up a running commentary. She only appears
// when a mission calls her — the rest of the time she is out on her
// own jobs across the bay.

import { pick } from './random.js';

const LINES = [
  'Left, left — the cops never watch the left.',
  'You drive like my abuela. Faster, abuela.',
  'If we get pinched, I was never here.',
  'That was clean. Vic is going to love this.',
  'Eyes on the road, hero. The bay is watching.',
  'I have seen snails with better lines than you.',
  'Next time, I drive. You navigate. Deal?',
];

export function init(ctx) {
  const T = ctx.THREE;
  const rng = ctx.rng;
  let active = false;
  let banterTimer = 14;

  const group = new T.Group();
  group.name = 'lena';
  const jacket = new T.MeshStandardMaterial({ color: 0xd64545, roughness: 0.8 });
  const jeans = new T.MeshStandardMaterial({ color: 0x2b4a6f, roughness: 0.9 });
  const skin = new T.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 });
  const body = new T.Mesh(new T.CylinderGeometry(0.4, 0.48, 1.05, 8), jacket);
  body.position.y = 1.02;
  body.castShadow = true;
  const head = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.8;
  const hair = new T.Mesh(new T.SphereGeometry(0.32, 10, 8), new T.MeshStandardMaterial({ color: 0x1a1a1a }));
  hair.position.y = 1.88;
  hair.scale.set(1, 0.8, 1);
  const legL = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.85, 6), jeans);
  legL.position.set(-0.19, 0.42, 0);
  const legR = legL.clone();
  legR.position.x = 0.19;
  group.add(body, head, hair, legL, legR);
  group.visible = false;
  ctx.scene.add(group);

  function setActive(on) {
    active = on;
    group.visible = on;
    if (on) {
      group.position.copy(ctx.player.pos).add(new T.Vector3(2, 0, 2));
      ctx.dialogue.say('Lena Cruz', 'I am with you. Try not to get us killed.', 4);
    }
  }

  function update(dt) {
    if (!active || ctx.state.paused) return;
    const p = ctx.player;
    if (!p.onFoot && p.car) {
      // Riding shotgun: parked in the passenger seat, hidden inside the car.
      const side = new T.Vector3(Math.cos(p.heading + Math.PI / 2), 0, -Math.sin(p.heading + Math.PI / 2));
      group.position.copy(p.car.pos).addScaledVector(side, -0.7);
      group.position.y = 0.4;
      group.rotation.y = p.heading;
      group.visible = true;
    } else {
      group.visible = true;
      const dx = p.pos.x - group.position.x;
      const dz = p.pos.z - group.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.5) {
        const sp = 9;
        group.position.x += (dx / d) * sp * dt;
        group.position.z += (dz / d) * sp * dt;
        group.rotation.y = Math.atan2(dx, dz);
      }
    }
    banterTimer -= dt;
    if (banterTimer <= 0) {
      banterTimer = 16 + rng() * 14;
      ctx.dialogue.say('Lena Cruz', pick(rng, LINES), 3.5);
    }
  }

  ctx.updaters.push(update);
  const api = { group, setActive, update, get active() { return active; } };
  ctx.crew = api;
  return api;
}
