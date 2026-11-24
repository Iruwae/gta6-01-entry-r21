// SOLMAR BAY — dialogue. A small subtitle queue: mission briefs, crew
// banter and story beats all funnel through say(). One line shows at a
// time in the subtitle bar; the queue drains in order so two speakers
// never talk over each other.

export function init(ctx) {
  const queue = [];
  let current = null;
  let timer = 0;

  function say(speaker, text, dur = 4) {
    queue.push({ speaker, text, dur });
  }

  function show(line) {
    current = line;
    timer = line.dur;
    const el = ctx.ui && ctx.ui.subtitle;
    if (el) {
      el.textContent = `${line.speaker}: ${line.text}`;
      el.classList.add('show');
    }
  }

  function hide() {
    const el = ctx.ui && ctx.ui.subtitle;
    if (el) el.classList.remove('show');
    current = null;
  }

  function update(dt) {
    if (ctx.state.paused) return;
    if (current) {
      timer -= dt;
      if (timer <= 0) hide();
    }
    if (!current && queue.length > 0) show(queue.shift());
  }

  ctx.updaters.push(update);
  const api = { say, update, get queue() { return queue.length; } };
  ctx.dialogue = api;
  return api;
}
