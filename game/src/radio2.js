// SOLMAR BAY — the six radio stations. Each station is a tiny step
// sequencer over the Web Audio API: a bass line and a lead line drawn
// from the station's scale, at its tempo, through its waveform. No
// audio files, no samples — every track is synthesized live, so the
// radio is original by construction. Q cycles stations; TALK 640 swaps
// music for banter lines instead.

import { CONFIG } from './config.js';
import { BANTER_LINES } from './banter.js';
import { pick } from './random.js';

export function init(ctx) {
  const state = ctx.state;
  let station = 0;
  let audioCtx = null;
  let timer = null;
  let step = 0;
  let talkTimer = 0;

  function ensureCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function note(freq, dur, wave, vol, when = 0) {
    const ac = ensureCtx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + when);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur + 0.05);
  }

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function playStep() {
    const st = CONFIG.radio[station];
    if (!st || st.wave === 'none') return;
    const beat = 60 / st.bpm / 2; // eighth notes
    const scale = st.scale;
    const bassNote = st.root + scale[step % scale.length] - 12;
    const leadNote = st.root + 12 + scale[(step * 2 + 1) % scale.length];
    if (step % 4 === 0) note(midiToFreq(bassNote), beat * 1.8, st.wave, 0.10);
    if (step % 2 === 0) note(midiToFreq(leadNote), beat * 0.9, st.wave, 0.05);
    if (step % 8 === 6) note(midiToFreq(st.root + 24), beat * 0.5, 'sine', 0.04);
    step += 1;
  }

  function startStation() {
    stopStation();
    const st = CONFIG.radio[station];
    step = 0;
    if (!st) return;
    ctx.bus.emit('toast', { text: `Radio: ${st.name} — ${st.genre}`, kind: 'info' });
    if (st.wave === 'none') return; // talk radio: banter, not music
    const ac = ensureCtx();
    if (!ac) return;
    const beatMs = (60 / st.bpm / 2) * 1000;
    timer = setInterval(playStep, beatMs);
  }

  function stopStation() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function cycle() {
    station = (station + 1) % CONFIG.radio.length;
    startStation();
    ctx.bus.emit('radio', { station: CONFIG.radio[station].name });
  }

  function currentName() {
    return CONFIG.radio[station].name;
  }

  function update(dt) {
    if (ctx.state.paused) return;
    if (ctx.input.wasPressed('KeyQ')) cycle();
    // Talk radio drops a caller line every ~20 seconds.
    const st = CONFIG.radio[station];
    if (st && st.wave === 'none') {
      talkTimer -= dt;
      if (talkTimer <= 0) {
        talkTimer = 18 + ctx.rng() * 10;
        ctx.dialogue.say('Caller', pick(ctx.rng, BANTER_LINES), 4);
      }
    }
  }

  ctx.updaters.push(update);
  const api = { cycle, currentName, startStation, stopStation, update, get station() { return station; } };
  ctx.radio = api;
  return api;
}
