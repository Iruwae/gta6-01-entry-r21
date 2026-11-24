// SOLMAR BAY — the city itself. Ground, bay water, the road grid, the
// buildings of all seven districts, palms, streetlights and the seven
// named places (MART, safehouse, garage, fence, taxi stand, race pad,
// pay-n-spray). Everything is plain boxes, cylinders and canvas
// textures — no imported models, so the whole city is a few hundred
// meshes built in under a second.

import { CONFIG } from './config.js';
import { range, pick } from './random.js';

export function init(ctx) {
  const T = ctx.THREE;
  const rng = ctx.rng;
  const group = new T.Group();
  group.name = 'city';
  ctx.scene.add(group);

  const W = CONFIG.world;
  const lamps = [];
  const buildings = [];
  const colliders = [];

  // --- ground: sand-coloured land, then the bay ---
  const land = new T.Mesh(
    new T.PlaneGeometry(W.size, W.size),
    new T.MeshStandardMaterial({ color: 0xcbb28a, roughness: 1 }),
  );
  land.rotation.x = -Math.PI / 2;
  land.position.set(-90, 0, 0);
  land.receiveShadow = true;
  group.add(land);

  const water = new T.Mesh(
    new T.PlaneGeometry(220, W.size),
    new T.MeshStandardMaterial({ color: CONFIG.palette.water, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(510, 0.4, 0);
  group.add(water);
  ctx.water = water;

  // --- roads: one shared asphalt texture with a dashed centre line ---
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 64;
  roadCanvas.height = 64;
  const rc = roadCanvas.getContext('2d');
  rc.fillStyle = '#2b2b33';
  rc.fillRect(0, 0, 64, 64);
  rc.fillStyle = '#d8d8c8';
  rc.fillRect(30, 4, 4, 20);
  rc.fillRect(30, 36, 4, 20);
  const roadTex = new T.CanvasTexture(roadCanvas);
  roadTex.wrapS = T.RepeatWrapping;
  roadTex.wrapT = T.RepeatWrapping;
  const roadMat = new T.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });

  const roadGeo = new T.PlaneGeometry(14, W.size);
  const roads = [];
  for (let x = -600; x <= 400; x += W.roadEvery) {
    const road = new T.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.05, 0);
    road.receiveShadow = true;
    group.add(road);
    roads.push({ x, vertical: true });
  }
  for (let z = -600; z <= 600; z += W.roadEvery) {
    const road = new T.Mesh(new T.PlaneGeometry(W.size - 180, 14), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-90, 0.05, z);
    road.receiveShadow = true;
    group.add(road);
    roads.push({ z, vertical: false });
  }

  // --- facade texture: lit windows on a dark face ---
  const winCanvas = document.createElement('canvas');
  winCanvas.width = 128;
  winCanvas.height = 256;
  const wc = winCanvas.getContext('2d');
  wc.fillStyle = '#20222e';
  wc.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 22) {
    for (let x = 8; x < 120; x += 18) {
      wc.fillStyle = rng() < 0.55 ? '#ffd98a' : '#3a3f55';
      wc.fillRect(x, y, 11, 14);
    }
  }
  const winTex = new T.CanvasTexture(winCanvas);

  const boxGeo = new T.BoxGeometry(1, 1, 1);
  const roofMat = new T.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 1 });

  // --- buildings: one per block, skipped on roads and the bay ---
  for (let bx = -600; bx < 400; bx += W.roadEvery) {
    for (let bz = -600; bz < 600; bz += W.roadEvery) {
      if (rng() < 0.18) continue; // empty lot / park
      const cx = bx + W.roadEvery / 2;
      const cz = bz + W.roadEvery / 2;
      const d = ctx.districts.districtAt(cx, cz);
      const h = (18 + rng() * 55) * d.tall;
      const w = 34 + rng() * 26;
      const dep = 34 + rng() * 26;
      const base = pick(rng, d.palette.base);
      const mat = new T.MeshStandardMaterial({ color: base, map: winTex, roughness: 0.85 });
      const b = new T.Mesh(boxGeo, mat);
      b.scale.set(w, h, dep);
      b.position.set(cx, h / 2, cz);
      b.castShadow = true;
      b.receiveShadow = true;
      group.add(b);
      const roof = new T.Mesh(boxGeo, roofMat);
      roof.scale.set(w + 1.5, 1.2, dep + 1.5);
      roof.position.set(cx, h + 0.6, cz);
      group.add(roof);
      buildings.push({ mesh: b, district: d.name, x: cx, z: cz, h });
      colliders.push({ x: cx, z: cz, r: Math.max(w, dep) * 0.62 });
      // neon accent strip on neon-mile towers
      if (d.style === 'neon' && rng() < 0.7) {
        const strip = new T.Mesh(
          new T.BoxGeometry(w + 0.4, 1.1, 0.4),
          new T.MeshStandardMaterial({ color: d.palette.accent, emissive: d.palette.accent, emissiveIntensity: 1.6 }),
        );
        strip.position.set(cx, h * 0.82, cz + dep / 2 + 0.2);
        group.add(strip);
      }
    }
  }

  // --- palms along the beach and the marina ---
  const trunkMat = new T.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const leafMat = new T.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 1 });
  const trunkGeo = new T.CylinderGeometry(0.35, 0.55, 9, 6);
  const leafGeo = new T.ConeGeometry(3.2, 4.5, 6);
  for (let i = 0; i < 46; i++) {
    const x = 380 + range(rng, -14, 14);
    const z = -580 + i * 26 + range(rng, -6, 6);
    const trunk = new T.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 4.5, z);
    trunk.rotation.z = range(rng, -0.12, 0.12);
    group.add(trunk);
    const leaves = new T.Mesh(leafGeo, leafMat);
    leaves.position.set(x, 10.4, z);
    group.add(leaves);
  }

  // --- streetlights on every other intersection ---
  const poleMat = new T.MeshStandardMaterial({ color: 0x30323a, roughness: 0.6, metalness: 0.5 });
  const lampGeo = new T.SphereGeometry(0.7, 8, 6);
  for (let x = -600; x <= 400; x += 200) {
    for (let z = -600; z <= 600; z += 200) {
      const pole = new T.Mesh(new T.CylinderGeometry(0.18, 0.24, 7, 6), poleMat);
      pole.position.set(x + 8, 3.5, z + 8);
      group.add(pole);
      const lampMat = new T.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0.15 });
      const lamp = new T.Mesh(lampGeo, lampMat);
      lamp.position.set(x + 8, 7.1, z + 8);
      group.add(lamp);
      lamps.push(lampMat);
    }
  }

  // --- named places: simple landmark builds + floating sign text ---
  function sign(text, x, y, z, color) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#101018';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = color || '#ffd166';
    g.font = 'bold 30px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 34);
    const tex = new T.CanvasTexture(c);
    const m = new T.Mesh(
      new T.PlaneGeometry(16, 4),
      new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }),
    );
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  function placeBox(x, z, w, h, d, color, name) {
    const m = new T.Mesh(boxGeo, new T.MeshStandardMaterial({ color, roughness: 0.9 }));
    m.scale.set(w, h, d);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    group.add(m);
    sign(name, x, h + 4, z, '#ffd166');
    colliders.push({ x, z, r: Math.max(w, d) * 0.6 });
    return m;
  }

  const P = CONFIG.places;
  placeBox(P.mart.x, P.mart.z, 30, 9, 22, 0xe07a5f, 'MART');
  placeBox(P.safehouse.x, P.safehouse.z, 18, 8, 16, 0x80b918, 'SAFEHOUSE');
  placeBox(P.garage.x, P.garage.z, 34, 10, 24, 0x4cc9f0, 'GARAGE');
  placeBox(P.fence.x, P.fence.z, 26, 7, 20, 0xb5838d, "VIC'S FENCE");
  placeBox(P.taxiStand.x, P.taxiStand.z, 12, 5, 12, 0xffd166, 'TAXI');
  placeBox(P.paynspray.x, P.paynspray.z, 20, 8, 16, 0xff5da2, 'PAY-N-SPRAY');

  // race pad: flat start line on the road
  const pad = new T.Mesh(
    new T.PlaneGeometry(16, 10),
    new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(P.racePad.x, 0.09, P.racePad.z);
  group.add(pad);
  sign('RACE', P.racePad.x, 5, P.racePad.z, '#ff2e88');

  // --- gulls are handled by people.js; expose what others need ---
  const api = {
    group,
    buildings,
    colliders,
    lamps,
    roads,
    districtAt: ctx.districts.districtAt,
    randomRoadPoint() {
      const vertical = rng() < 0.5;
      if (vertical) {
        const x = -600 + Math.floor(rng() * 11) * 100;
        return { x, z: range(rng, -550, 550) };
      }
      const z = -600 + Math.floor(rng() * 13) * 100;
      return { x: range(rng, -550, 380), z };
    },
    randomLandPoint() {
      return { x: range(rng, -560, 380), z: range(rng, -560, 560) };
    },
    // Circle test used by movement code to stay out of buildings.
    hitsBuilding(x, z, r) {
      for (const c of colliders) {
        const dx = x - c.x;
        const dz = z - c.z;
        if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return true;
      }
      return false;
    },
  };
  ctx.city = api;
  return api;
}
