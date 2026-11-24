// SOLMAR BAY — the ten story missions. Each mission is a short list of
// steps; a step is done when its check() returns true. Steps point at
// a map marker (a beacon pillar the player can see from anywhere), and
// finishing a mission pays cash and respect and unlocks the next one.
// Job 5 is the crew mission: Lena rides along. The HUD reads current()
// to show the objective; P opens the full job list.

import { CONFIG } from './config.js';
import { addMoney, addRespect } from './state.js';

function reach(x, z, r) {
  return (ctx) => {
    const p = ctx.player.pos;
    return Math.hypot(p.x - x, p.z - z) < r;
  };
}

function inCar() {
  return (ctx) => !!ctx.state.inCar;
}

function starsAtLeast(n) {
  return (ctx) => ctx.state.stars >= n;
}

function starsZero() {
  return (ctx) => ctx.state.stars === 0;
}

function countIs(key, n) {
  return (ctx) => ctx.state[key] >= n;
}

function isNight() {
  return (ctx) => ctx.daynight.isNight();
}

const MISSION_DEFS = [
  {
    steps: [
      { text: 'Get in Vic’s sedan', check: inCar(), target: null },
      { text: 'Drive to the MART drop-off', check: reach(120, 240, 10), target: { x: 120, z: 240 } },
    ],
  },
  {
    steps: [
      { text: 'Steal the sports car on Coral Court', check: (ctx) => !!ctx.state.inCar && ctx.state.inCar.kind === 'sport', target: { x: 200, z: 300 } },
      { text: 'Deliver it to Vic’s fence', check: reach(-480, 120, 12), target: { x: -480, z: 120 } },
    ],
    onStart(ctx) {
      ctx.vehicles.spawnCar('sport', 200, 300, 1.2, { label: 'stolen sports car', color: 0xd64545 });
      ctx.dialogue.say('Vic Torres', 'That red sport job on Coral Court? It is mine now. Bring it to the fence.');
    },
  },
  {
    steps: [
      { text: 'Collect 3 packages around town', check: countIs('packagesCollected', 3), target: null },
    ],
    onStart(ctx) {
      ctx.side.spawnPackages(3);
      ctx.dialogue.say('Vic Torres', 'Three packages stashed around the bay. Grab them all, no questions.');
    },
  },
  {
    steps: [
      { text: 'The cops spotted the drop — you are at 2 stars', check: starsAtLeast(2), target: null },
      { text: 'Lose the tail', check: starsZero(), target: null },
    ],
    onStart(ctx) {
      ctx.heat.addHeat(2, 'spotted drop');
      ctx.dialogue.say('Vic Torres', 'They saw the handoff! Shake them and do not come back hot.');
    },
  },
  {
    steps: [
      { text: 'Meet Lena at the Neon Mile grab point', check: reach(-100, -100, 10), target: { x: -100, z: -100 } },
      { text: 'Get Lena to the safehouse — clean', check: reach(-320, 420, 12), target: { x: -320, z: 420 } },
    ],
    onStart(ctx) {
      ctx.crew.setActive(true);
      ctx.dialogue.say('Lena Cruz', 'I drive, you watch the mirrors. Let us go get paid.');
    },
    onEnd(ctx) {
      ctx.crew.setActive(false);
    },
  },
  {
    steps: [
      { text: 'Finish 2 taxi fares before the clock runs out', check: countIs('faresDone', 2), target: null },
    ],
    onStart(ctx) {
      ctx.vehicles.spawnCar('taxi', 40, -60, 0.4, { label: 'taxi cab', color: 0xf2c14e });
      ctx.dialogue.say('Vic Torres', 'A cab, two fares, one clock. The meter is running, kid.');
    },
  },
  {
    steps: [
      { text: 'Win the street race on the Neon Mile', check: countIs('racesWon', 1), target: { x: 0, z: -200 } },
    ],
    onStart(ctx) {
      ctx.dialogue.say('Lena Cruz', 'The Mile eats slow drivers. Do not be a slow driver.');
    },
  },
  {
    steps: [
      { text: 'Wait for nightfall', check: isNight(), target: null },
      { text: 'Make the delivery at the MART — after dark', check: reach(120, 240, 10), target: { x: 120, z: 240 } },
    ],
    onStart(ctx) {
      if (ctx.state.time < 18.6) ctx.state.time = 18.6;
      ctx.dialogue.say('Vic Torres', 'This one moves after dark. Neon on, headlights off.');
    },
  },
  {
    steps: [
      { text: 'Take down 2 police cruisers', check: countIs('kills', 2), target: null },
      { text: 'Lose the heat', check: starsZero(), target: null },
    ],
    onStart(ctx) {
      ctx.heat.addHeat(2, 'payback');
      ctx.dialogue.say('Vic Torres', 'They jumped our boys. Settle it — and walk away.');
    },
  },
  {
    steps: [
      { text: 'Drop A — Marina Bay', check: reach(380, -300, 10), target: { x: 380, z: -300 } },
      { text: 'Drop B — Port Solmar', check: reach(-500, 200, 10), target: { x: -500, z: 200 } },
      { text: 'Drop C — Vice Row', check: reach(100, -400, 10), target: { x: 100, z: -400 } },
      { text: 'Lose the 3-star tail', check: starsZero(), target: null },
    ],
    onStart(ctx) {
      ctx.heat.addHeat(3, 'final job');
      ctx.dialogue.say('Vic Torres', 'Three drops, one long night. Make the bay remember your name.');
    },
  },
];

export function init(ctx) {
  const T = ctx.THREE;
  const state = ctx.state;

  // Objective beacon: a glowing pillar at the current target.
  const beacon = new T.Mesh(
    new T.CylinderGeometry(2.2, 2.2, 60, 12, 1, true),
    new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false }),
  );
  beacon.visible = false;
  ctx.scene.add(beacon);
  const beaconBase = new T.Mesh(
    new T.CylinderGeometry(3.4, 3.4, 0.4, 16),
    new T.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffc233, emissiveIntensity: 1.4 }),
  );
  beaconBase.visible = false;
  ctx.scene.add(beaconBase);

  function currentDef() {
    if (state.mission < 0 || state.mission >= MISSION_DEFS.length) return null;
    return MISSION_DEFS[state.mission];
  }

  function current() {
    const def = currentDef();
    if (!def) return null;
    const meta = CONFIG.missions[state.mission];
    return {
      meta,
      step: def.steps[state.missionStep] || null,
      stepIndex: state.missionStep,
      stepCount: def.steps.length,
    };
  }

  function startMission(i) {
    state.mission = i;
    state.missionStep = 0;
    state.missionActive = true;
    const def = MISSION_DEFS[i];
    const meta = CONFIG.missions[i];
    ctx.bus.emit('toast', { text: `Job ${meta.id}: ${meta.title} — $${meta.pay}`, kind: 'good' });
    ctx.dialogue.say(meta.giver, meta.brief, 5);
    if (def.onStart) def.onStart(ctx);
    ctx.bus.emit('mission-start', { mission: i });
  }

  function completeMission() {
    const meta = CONFIG.missions[state.mission];
    const def = MISSION_DEFS[state.mission];
    addMoney(state, meta.pay);
    addRespect(state, 120 + state.mission * 30);
    ctx.bus.emit('toast', { text: `Job done: ${meta.title} — +$${meta.pay}, +${120 + state.mission * 30} respect.`, kind: 'good' });
    ctx.bus.emit('mission-complete', { mission: state.mission, pay: meta.pay });
    if (def.onEnd) def.onEnd(ctx);
    state.mission += 1;
    state.missionStep = 0;
    if (state.mission >= MISSION_DEFS.length) {
      state.mission = -1;
      state.missionActive = false;
      ctx.bus.emit('toast', { text: 'STORY COMPLETE — you are a BAY LEGEND.', kind: 'good' });
      ctx.dialogue.say('Vic Torres', 'The whole bay knows your name now. Legend.', 6);
    } else {
      state.missionActive = false;
      ctx.bus.emit('toast', { text: 'Next job is waiting — press P to see the job list.', kind: 'info' });
    }
    beacon.visible = false;
    beaconBase.visible = false;
  }

  function update(dt) {
    if (state.paused) return;
    // Auto-start the first job; later jobs start from the pause menu.
    if (!state.missionActive && state.mission === 0 && !state.flags.introDone) {
      state.flags.introDone = true;
      startMission(0);
    }
    if (!state.missionActive) return;
    const cur = current();
    if (!cur || !cur.step) return;
    const target = cur.step.target;
    if (target) {
      beacon.visible = true;
      beaconBase.visible = true;
      beacon.position.set(target.x, 30, target.z);
      beaconBase.position.set(target.x, 0.2, target.z);
      beacon.rotation.y += dt * 0.8;
    } else {
      beacon.visible = false;
      beaconBase.visible = false;
    }
    if (cur.step.check(ctx)) {
      state.missionStep += 1;
      ctx.bus.emit('toast', { text: 'Objective done.', kind: 'good' });
      if (state.missionStep >= cur.stepCount) completeMission();
    }
  }

  ctx.updaters.push(update);
  const api = { current, startMission, completeMission, update, beacon };
  ctx.missions = api;
  return api;
}
