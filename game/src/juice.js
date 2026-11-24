// SOLMAR BAY — juice. Screen shake, particle bursts and the NOS
// flame trail. One shared particle pool (a single THREE.Points) so
// explosions, hit sparks and boost flames never allocate mid-frame.
// The camera shake is applied after the player module has placed the
// camera, right before the frame renders.

export function init(ctx) {
  const T = ctx.THREE;
  const MAX = 400;
  const positions = new Float32Array(MAX * 3);
  const velocities = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX);
  const colors = new Float32Array(MAX * 3);
  // Park dead particles far below the world so they never render.
  for (let i = 0; i < MAX; i++) positions[i * 3 + 1] = -100;
  let cursor = 0;

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(positions, 3));
  geo.setAttribute('color', new T.BufferAttribute(colors, 3));
  const points = new T.Points(geo, new T.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95 }));
  points.frustumCulled = false;
  ctx.scene.add(points);

  let shake = 0;

  function burst(pos, colorHex, n, speed, up = 4) {
    const c = new T.Color(colorHex);
    for (let i = 0; i < n; i++) {
      const idx = cursor;
      cursor = (cursor + 1) % MAX;
      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y + 0.5;
      positions[idx * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      velocities[idx * 3] = Math.cos(a) * s;
      velocities[idx * 3 + 1] = up * (0.4 + Math.random() * 0.8);
      velocities[idx * 3 + 2] = Math.sin(a) * s;
      life[idx] = 0.5 + Math.random() * 0.6;
      colors[idx * 3] = c.r;
      colors[idx * 3 + 1] = c.g;
      colors[idx * 3 + 2] = c.b;
    }
    geo.attributes.color.needsUpdate = true;
  }

  function addShake(amount) {
    shake = Math.min(1.2, shake + amount);
  }

  ctx.bus.on('explosion', (e) => {
    burst(e.pos, 0xff7722, 60, 16, 9);
    burst(e.pos, 0xffcc44, 30, 10, 7);
    addShake(0.9);
  });
  ctx.bus.on('hitmark', (e) => burst(e.pos, 0xffe066, 12, 6, 3));
  ctx.bus.on('crash', () => {
    burst(ctx.player.pos, 0x999999, 10, 7, 4);
    addShake(0.45);
  });
  ctx.bus.on('shake', (e) => addShake(e.amount || 0.2));
  ctx.bus.on('nos', (e) => {
    const back = new T.Vector3(-Math.sin(e.car.heading), 0, -Math.cos(e.car.heading));
    const p = e.car.pos.clone().addScaledVector(back, 2.6);
    p.y = 0.8;
    burst(p, 0x4488ff, 4, 3, 1);
  });

  function update(dt) {
    if (ctx.state.paused) return;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      velocities[i * 3 + 1] -= 12 * dt;
      if (life[i] <= 0) positions[i * 3 + 1] = -100;
    }
    geo.attributes.position.needsUpdate = true;
    if (shake > 0) {
      shake = Math.max(0, shake - dt * 1.8);
      const s = shake * 0.35;
      ctx.camera.position.x += (Math.random() - 0.5) * s;
      ctx.camera.position.y += (Math.random() - 0.5) * s;
    }
  }

  ctx.updaters.push(update);
  const api = { burst, addShake, update };
  ctx.juice = api;
  return api;
}
