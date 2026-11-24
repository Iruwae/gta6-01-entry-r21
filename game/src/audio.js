// SOLMAR BAY — sound effects. Everything is synthesized with the Web
// Audio API: gunshots and crashes are shaped noise, the siren is a
// two-tone oscillator, pickups are little blips, and the engine is a
// low oscillator whose pitch follows the player's speed. No audio
// files anywhere in the game.

export function init(ctx) {
  let ac = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;

  function ensure() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function noiseBurst(dur, vol, freq) {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 1200;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
  }

  function blip(freq, dur, vol, wave = 'sine') {
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  function setEngine(speed) {
    const c = ensure();
    if (!c) return;
    if (!engineOsc) {
      engineOsc = c.createOscillator();
      engineGain = c.createGain();
      engineOsc.type = 'sawtooth';
      engineGain.gain.value = 0;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      engineOsc.connect(filter).connect(engineGain).connect(c.destination);
      engineOsc.start();
    }
    const s = Math.abs(speed || 0);
    engineOsc.frequency.value = 55 + s * 2.2;
    engineGain.gain.value = s > 0.5 ? 0.035 : 0;
  }

  function setSiren(on) {
    const c = ensure();
    if (!c) return;
    if (on && !sirenOsc) {
      sirenOsc = c.createOscillator();
      sirenGain = c.createGain();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain.gain.value = 0.02;
      sirenLfo = c.createOscillator();
      sirenLfo.frequency.value = 0.8;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 220;
      sirenLfo.connect(lfoGain).connect(sirenOsc.frequency);
      sirenOsc.connect(sirenGain).connect(c.destination);
      sirenOsc.start();
      sirenLfo.start();
    } else if (!on && sirenOsc) {
      try {
        sirenOsc.stop();
        sirenLfo.stop();
      } catch (e) { /* already stopped */ }
      sirenOsc = null;
      sirenLfo = null;
      sirenGain = null;
    }
  }

  // Wire the bus: gameplay events become sounds.
  ctx.bus.on('gunshot', () => noiseBurst(0.14, 0.5, 2600));
  ctx.bus.on('crash', () => noiseBurst(0.3, 0.4, 500));
  ctx.bus.on('explosion', () => noiseBurst(0.8, 0.7, 300));
  ctx.bus.on('pickup', () => {
    blip(660, 0.12, 0.16);
    setTimeout(() => blip(990, 0.16, 0.16), 90);
  });
  ctx.bus.on('wanted', (e) => setSiren(e.stars > 0));

  function update() {
    const car = ctx.state.inCar;
    setEngine(car ? car.speed : 0);
  }

  ctx.updaters.push(update);
  const api = { blip, noiseBurst, setEngine, setSiren, update };
  ctx.audio = api;
  return api;
}
