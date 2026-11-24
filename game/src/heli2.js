// SOLMAR BAY — the police helicopter. It shows up at 3+ stars, circles
// the player and pins a searchlight on them so the ground units can
// keep the chase going. One heli, one light, one rotor — it is a
// presence, not a second police force.

export function init(ctx) {
  const T = ctx.THREE;
  const state = ctx.state;

  const group = new T.Group();
  group.name = 'heli';
  const bodyMat = new T.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.5, metalness: 0.4 });
  const body = new T.Mesh(new T.BoxGeometry(4.4, 1.7, 7.5), bodyMat);
  body.castShadow = true;
  const tail = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 5.5), bodyMat);
  tail.position.set(0, 0.3, -6);
  const rotor = new T.Mesh(new T.BoxGeometry(11, 0.12, 0.6), new T.MeshStandardMaterial({ color: 0x333333 }));
  rotor.position.y = 1.3;
  const tailRotor = new T.Mesh(new T.BoxGeometry(0.1, 2.2, 0.5), new T.MeshStandardMaterial({ color: 0x333333 }));
  tailRotor.position.set(0.45, 0.3, -8.4);
  const glass = new T.Mesh(
    new T.BoxGeometry(3.6, 1.0, 2.2),
    new T.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.8 }),
  );
  glass.position.set(0, 0.35, 2.6);
  group.add(body, tail, rotor, tailRotor, glass);

  // Searchlight: a cone of translucent light plus one real spotlight.
  const cone = new T.Mesh(
    new T.ConeGeometry(7, 55, 16, 1, true),
    new T.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -28;
  group.add(cone);
  const spot = new T.SpotLight(0xfff2b0, 60, 120, 0.32, 0.5, 1.2);
  spot.position.set(0, -1, 0);
  group.add(spot);
  group.add(spot.target);

  group.visible = false;
  ctx.scene.add(group);

  let angle = 0;
  let active = false;

  function update(dt) {
    if (state.paused) return;
    const want = state.stars >= 3;
    if (want && !active) {
      active = true;
      group.visible = true;
      ctx.bus.emit('toast', { text: 'Police helicopter overhead! Lose it in the tunnels — or outrun it.', kind: 'bad' });
    }
    if (!want && active) {
      active = false;
      group.visible = false;
    }
    if (!active) return;
    angle += dt * 0.32;
    const p = ctx.player.pos;
    group.position.set(p.x + Math.cos(angle) * 42, 58 + Math.sin(ctx.clock.elapsedTime * 0.6) * 2, p.z + Math.sin(angle) * 42);
    group.lookAt(p.x, 0, p.z);
    rotor.rotation.y += dt * 22;
    tailRotor.rotation.x += dt * 30;
    spot.target.position.set(p.x - group.position.x, -group.position.y, p.z - group.position.z);
    cone.lookAt(p.x, 0, p.z);
    cone.rotateX(Math.PI / 2 + 0.06);
  }

  ctx.updaters.push(update);
  const api = { group, update, get active() { return active; } };
  ctx.heli = api;
  return api;
}
