// SOLMAR BAY — sky, sun, moon and stars. One directional sun light, one
// hemisphere fill, a gradient sky colour and a star field that fades in
// after dark. setSun(hour) is the only entry point; daynight.js calls it
// every frame with the advancing clock.

import { CONFIG } from './config.js';

function lerpColor(a, b, t, T) {
  const ca = new T.Color(a);
  const cb = new T.Color(b);
  return ca.lerp(cb, t);
}

export function init(ctx) {
  const T = ctx.THREE;
  const scene = ctx.scene;

  const sun = new T.DirectionalLight(0xffc27a, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 900;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new T.HemisphereLight(0xbfd8ff, 0x8a6a4a, 0.9);
  scene.add(hemi);

  // Stars: a shell of points, invisible until night.
  const starGeo = new T.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 700; i++) {
    const a = ctx.rng() * Math.PI * 2;
    const e = ctx.rng() * Math.PI * 0.45 + 0.08;
    const r = 1500;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
  const stars = new T.Points(starGeo, new T.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0 }));
  scene.add(stars);

  // The moon: a pale disc that rises after sunset.
  const moon = new T.Mesh(
    new T.CircleGeometry(34, 24),
    new T.MeshBasicMaterial({ color: 0xe8ecff, transparent: true, opacity: 0, fog: false }),
  );
  scene.add(moon);

  const fog = new T.Fog(0xffb37a, 350, 1400);
  scene.fog = fog;

  function setSun(hour) {
    // hour 0..24; sun is up roughly 6..19, golden at 17..19.
    const dayT = (hour - 6) / 13; // 0 at dawn, 1 at dusk
    const elev = Math.sin(dayT * Math.PI); // 0 at horizon, 1 at noon
    const azim = dayT * Math.PI * 1.2 - 0.4;
    const dist = 700;
    sun.position.set(Math.cos(azim) * dist, Math.max(20, elev * 520), Math.sin(azim) * dist);
    const target = ctx.player ? ctx.player.pos : { x: 0, z: 0 };
    sun.target.position.set(target.x, 0, target.z);

    let sky;
    let intensity;
    if (hour >= 6 && hour < 16.5) {
      sky = lerpColor(0x9fc8ee, 0xffe0a8, Math.min(1, (hour - 6) / 10), T);
      intensity = 2.4;
    } else if (hour >= 16.5 && hour < 19.5) {
      const t = (hour - 16.5) / 3;
      sky = lerpColor(0xffb37a, 0x3a2350, t, T);
      intensity = 2.4 - t * 1.5;
    } else {
      sky = lerpColor(0x2a1e4f, 0x070a18, hour >= 20 ? 0.7 : 0.3, T);
      intensity = 0.35;
    }
    scene.background = sky;
    fog.color.copy(sky);
    sun.intensity = intensity;
    sun.color.setHex(hour >= 16.5 && hour < 19.5 ? 0xff9a56 : 0xfff2d8);
    hemi.intensity = hour >= 19.5 || hour < 6 ? 0.25 : 0.9;

    const night = hour >= 19.5 || hour < 5.5 ? 1 : hour >= 18.5 ? (hour - 18.5) : 0;
    stars.material.opacity = Math.min(1, night);
    moon.material.opacity = Math.min(1, night) * 0.95;
    if (night > 0) {
      moon.position.set(-500, 420, -700);
      moon.lookAt(ctx.camera.position);
    }
    return { elev, night };
  }

  const api = { sun, hemi, stars, moon, setSun };
  ctx.sky = api;
  return api;
}
