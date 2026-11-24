// SOLMAR BAY — ambient life. Drifting clouds, blinking aircraft
// warning lights on the downtown towers, and the slow pulse of the
// city's neon. Nothing the player interacts with — the module exists
// so the skyline never looks frozen while the player is busy elsewhere.

import { range } from './random.js';

export function init(ctx) {
  const T = ctx.THREE;
  const rng = ctx.rng;
  const group = new T.Group();
  group.name = 'ambient';
  ctx.scene.add(group);

  // Clouds: flattened white spheres, drifting east on the wind.
  const cloudMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new T.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < puffs; j++) {
      const s = new T.Mesh(new T.SphereGeometry(range(rng, 14, 26), 8, 6), cloudMat);
      s.scale.y = 0.32;
      s.position.set(j * 18 - puffs * 9, range(rng, -2, 2), range(rng, -8, 8));
      c.add(s);
    }
    c.position.set(range(rng, -600, 500), range(rng, 150, 230), range(rng, -550, 550));
    group.add(c);
    clouds.push({ group: c, speed: range(rng, 1.2, 3) });
  }

  // Warning lights on the tallest downtown towers.
  const beacons = [];
  const beaconMat = new T.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 });
  for (const b of ctx.city.buildings) {
    if (b.h > 55 && b.district === 'Vice Row') {
      const light = new T.Mesh(new T.SphereGeometry(0.9, 8, 6), beaconMat.clone());
      light.position.set(b.x, b.h + 1.6, b.z);
      group.add(light);
      beacons.push(light.material);
    }
  }

  function update(dt) {
    if (ctx.state.paused) return;
    for (const c of clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > 650) c.group.position.x = -650;
    }
    const blink = Math.sin(ctx.clock.elapsedTime * 2.4) > 0 ? 2 : 0.15;
    for (const m of beacons) m.emissiveIntensity = blink;
    // Neon signs breathe: the city's accent lights pulse gently.
    const pulse = 1.35 + Math.sin(ctx.clock.elapsedTime * 1.3) * 0.35;
    if (ctx.city.neonPulse) ctx.city.neonPulse(pulse);
  }

  ctx.updaters.push(update);
  const api = { clouds, beacons, update };
  ctx.ambient = api;
  return api;
}
