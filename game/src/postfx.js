// SOLMAR BAY — post effects. No shader passes: a CSS vignette darkens
// the frame edges, a red flash answers crashes and explosions, and a
// slow pulse warns when health is low. Cheap, always on, and it works
// in every browser the game supports.

export function init(ctx) {
  const vignette = document.createElement('div');
  vignette.id = 'vignette';
  document.body.appendChild(vignette);

  const flash = document.createElement('div');
  flash.id = 'damage-flash';
  document.body.appendChild(flash);

  let flashLevel = 0;

  ctx.bus.on('crash', () => { flashLevel = Math.max(flashLevel, 0.55); });
  ctx.bus.on('explosion', () => { flashLevel = Math.max(flashLevel, 0.7); });
  ctx.bus.on('busted', () => { flashLevel = 1; });

  function update(dt) {
    if (flashLevel > 0) {
      flashLevel = Math.max(0, flashLevel - dt * 1.4);
      flash.style.opacity = String(flashLevel);
    }
    // Low health: the edges of the screen throb red.
    const low = ctx.state.health < 30 && ctx.state.health > 0;
    vignette.style.boxShadow = low
      ? `inset 0 0 ${90 + Math.sin(ctx.clock.elapsedTime * 5) * 30}px rgba(200, 20, 20, ${0.55 + Math.sin(ctx.clock.elapsedTime * 5) * 0.2})`
      : 'inset 0 0 120px rgba(0, 0, 0, 0.55)';
  }

  ctx.updaters.push(update);
  const api = { update, vignette, flash };
  ctx.postfx = api;
  return api;
}
