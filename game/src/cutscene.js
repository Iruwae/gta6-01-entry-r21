// SOLMAR BAY — cutscenes. A list of camera shots with subtitles, played
// letterboxed; X skips. The player cannot move while a cutscene runs.
// Used for the intro and the crew job; the game stays playable if a
// cutscene is skipped halfway through.

export function init(ctx) {
  let active = null;
  let shotIndex = 0;
  let shotTimer = 0;
  const from = { pos: null, look: null };

  function play(def) {
    active = def;
    shotIndex = 0;
    shotTimer = 0;
    ctx.state.cutscene = true;
    document.body.classList.add('cutscene');
    const cam = ctx.camera;
    from.pos = cam.position.clone();
    from.look = new (ctx.THREE.Vector3)();
    cam.getWorldDirection(from.look);
    if (def.subs && def.subs[0]) ctx.dialogue.say(def.subs[0].speaker, def.subs[0].text, def.subs[0].dur || 4);
  }

  function end() {
    active = null;
    ctx.state.cutscene = false;
    document.body.classList.remove('cutscene');
    ctx.bus.emit('cutscene-end', {});
  }

  function skip() {
    if (active) end();
  }

  function update(dt) {
    if (!active) return;
    if (ctx.input.wasPressed('KeyX')) {
      skip();
      return;
    }
    const shot = active.shots[shotIndex];
    if (!shot) {
      end();
      return;
    }
    shotTimer += dt;
    const t = Math.min(1, shotTimer / (shot.dur || 3));
    const cam = ctx.camera;
    const target = shot.pos;
    const look = shot.look;
    cam.position.lerp(new ctx.THREE.Vector3(target.x, target.y, target.z), Math.min(1, dt * 2.2));
    cam.lookAt(look.x, look.y, look.z);
    if (shot.sub && t > 0.05 && !shot.subShown) {
      shot.subShown = true;
      ctx.dialogue.say(shot.sub.speaker, shot.sub.text, shot.sub.dur || 4);
    }
    if (t >= 1) {
      shotIndex += 1;
      shotTimer = 0;
    }
  }

  function playIntro() {
    play({
      shots: [
        {
          pos: { x: 430, y: 60, z: -120 }, look: { x: 100, y: 8, z: -60 }, dur: 4,
          sub: { speaker: 'Narrator', text: 'Solmar Bay. One long sunset, one small-time hustler, one big name to make.', dur: 4 },
        },
        {
          pos: { x: -10, y: 14, z: 30 }, look: { x: -40, y: 2, z: 60 }, dur: 3.5,
          sub: { speaker: 'Vic Torres', text: 'You want in? Start small. My sedan, the MART, no heat.', dur: 3.5 },
        },
      ],
    });
  }

  ctx.updaters.push(update);
  const api = { play, skip, playIntro, update, get active() { return !!active; } };
  ctx.cutscene = api;
  return api;
}
