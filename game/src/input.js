// SOLMAR BAY — keyboard and mouse. Tracks held keys, edge-triggered
// presses (consumed once per frame so a menu key never double-fires),
// and the mouse for aiming. No dependencies; attaches to window once.

export function init(ctx) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, clicked: false };
  let wheel = 0;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) mouse.down = false;
  }

  function onWheel(e) {
    wheel += e.deltaY;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel);
  window.addEventListener('blur', onBlur);

  const api = {
    keys,
    mouse,
    isDown(code) {
      return keys.has(code);
    },
    // True once, on the frame the key went down; cleared by endFrame().
    wasPressed(code) {
      return pressed.has(code);
    },
    wheelDelta() {
      const w = wheel;
      wheel = 0;
      return w;
    },
    // WASD / arrows as a -1..1 pair, already normalised.
    moveAxis() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len };
    },
    running() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    endFrame() {
      pressed.clear();
      mouse.dx = 0;
      mouse.dy = 0;
      mouse.clicked = false;
    },
  };

  ctx.input = api;
  return api;
}
