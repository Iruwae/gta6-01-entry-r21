// SOLMAR BAY — boot hub. Builds the shared context, initialises every
// module in dependency order, applies the ?scene= preset (used by the
// screenshot tool), and runs the frame loop. Every module exports an
// init(ctx); the context is the only way modules talk to each other.
// window.__solmar exposes the live state for debugging and checks.

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createRng } from './random.js';
import { init as initRender } from './render.js';
import { init as initDistricts } from './districts.js';
import { init as initCity } from './city.js';
import { init as initSky } from './sky.js';
import { init as initDaynight } from './daynight.js';
import { init as initInput } from './input.js';
import { init as initAmbient } from './ambient.js';
import { init as initPeople } from './people.js';
import { init as initVehicles } from './vehicles.js';
import { init as initPlayer } from './player.js';
import { init as initWeapons } from './weapons.js';
import { init as initPolice } from './police.js';
import { init as initHeat } from './heat.js';
import { init as initHeli } from './heli2.js';
import { init as initMissions } from './missions.js';
import { init as initCrew } from './crew.js';
import { init as initDialogue } from './dialogue.js';
import { init as initCutscene } from './cutscene.js';
import { init as initBanter } from './banter.js';
import { init as initRadio } from './radio2.js';
import { init as initAudio } from './audio.js';
import { init as initRespect } from './respect.js';
import { init as initChallenges } from './challenges.js';
import { init as initGarage } from './garage.js';
import { init as initShop } from './shop.js';
import { init as initSafehouse } from './safehouse.js';
import { init as initFence } from './fence.js';
import { init as initSide } from './side.js';
import { init as initHud } from './hud.js';
import { init as initJuice } from './juice.js';
import { init as initPostfx } from './postfx.js';

const params = new URLSearchParams(window.location.search);
const sceneName = params.get('scene') || 'start';
const seed = parseInt(params.get('seed') || '20261124', 10);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffb37a);
const clock = new THREE.Clock();
const rng = createRng(seed);
const state = createState(CONFIG);

const listeners = {};
const bus = {
  on(ev, fn) {
    (listeners[ev] = listeners[ev] || []).push(fn);
  },
  emit(ev, data) {
    for (const fn of listeners[ev] || []) {
      try {
        fn(data || {});
      } catch (err) {
        console.error('bus handler failed for', ev, err);
      }
    }
  },
};

const ctx = {
  THREE,
  scene,
  clock,
  config: CONFIG,
  state,
  rng,
  bus,
  updaters: [],
  ui: {},
  flags: { scene: sceneName },
};

initRender(ctx);
initDistricts(ctx);
initCity(ctx);
initSky(ctx);
initDaynight(ctx);
initInput(ctx);
initAmbient(ctx);
initPeople(ctx);
initVehicles(ctx);
initPlayer(ctx);
initWeapons(ctx);
initPolice(ctx);
initHeat(ctx);
initHeli(ctx);
initMissions(ctx);
initCrew(ctx);
initDialogue(ctx);
initCutscene(ctx);
initBanter(ctx);
initRadio(ctx);
initAudio(ctx);
initRespect(ctx);
initChallenges(ctx);
initGarage(ctx);
initShop(ctx);
initSafehouse(ctx);
initFence(ctx);
initSide(ctx);
initHud(ctx);
initJuice(ctx);
initPostfx(ctx);

// --- scene presets (?scene=...), used by the screenshot tool ---
function applyScene(name) {
  const p = ctx.player;
  if (name === 'garage') {
    state.time = 12.5;
    p.pos.set(CONFIG.places.garage.x + 18, 0, CONFIG.places.garage.z + 6);
    p.group.position.copy(p.pos);
  } else if (name === 'race') {
    const pad = CONFIG.places.racePad;
    const car = ctx.vehicles.starter;
    car.pos.set(pad.x, 0, pad.z);
    car.heading = Math.PI / 2;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    ctx.vehicles.takeCar(car);
    p.car = car;
    p.onFoot = false;
    state.inCar = car;
    p.group.visible = false;
    p.heading = car.heading;
    p.camYaw = car.heading + Math.PI;
    state.time = 17.2;
  } else if (name === 'night') {
    state.time = 21.4;
    const car = ctx.vehicles.starter;
    car.pos.set(100, 0, -100);
    car.heading = Math.PI;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    ctx.vehicles.takeCar(car);
    p.car = car;
    p.onFoot = false;
    state.inCar = car;
    p.group.visible = false;
    p.heading = car.heading;
    p.camYaw = car.heading + Math.PI;
  } else if (name === 'chase') {
    state.time = 17.8;
    const car = ctx.vehicles.spawnCar('sport', 100, -40, 0, { label: 'getaway car', color: 0xd64545 });
    ctx.vehicles.takeCar(car);
    p.car = car;
    p.onFoot = false;
    state.inCar = car;
    p.group.visible = false;
    p.heading = car.heading;
    p.camYaw = car.heading + Math.PI;
    ctx.heat.addHeat(2, 'screenshot chase');
  }
}

applyScene(sceneName);
if (sceneName === 'start') {
  setTimeout(() => ctx.cutscene.playIntro(), 700);
}

window.__solmar = { ctx, state, version: 'r21' };

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const fn of ctx.updaters) fn(dt);
  ctx.input.endFrame();
  ctx.render.renderer.render(scene, ctx.camera);
}

frame();
