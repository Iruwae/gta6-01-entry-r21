// SOLMAR BAY — shared game state. One plain object, created fresh per
// run, so the whole game can read and write the same numbers. The boot
// hub owns the instance; modules read it through ctx.state.

export function createState(config) {
  return {
    money: config.player.startMoney,
    respect: 0,
    health: config.player.maxHealth,
    armor: 0,
    stars: 0,
    time: 17.6, // golden hour: 17:36, the sun is low over the bay
    day: 1,
    mission: 0, // index into config.missions; -1 means the story is done
    missionStep: 0,
    missionActive: false,
    paused: false,
    inCar: null,
    weaponIndex: 0,
    ammo: [12, 30, 6, 20],
    ownedCars: [],
    storedCars: [],
    tuning: { engine: 0, armor: 0, paint: 0, nos: 0 },
    nos: 0,
    inventory: {},
    packagesCollected: 0,
    racesWon: 0,
    faresDone: 0,
    earnedToday: 0,
    kills: 0,
    distanceDriven: 0,
    flags: {},
    stats: { shots: 0, hits: 0, arrests: 0, escapes: 0 },
  };
}

export function addMoney(state, amount) {
  state.money += amount;
  if (amount > 0) state.earnedToday += amount;
  return state.money;
}

export function addRespect(state, amount) {
  state.respect = Math.max(0, state.respect + amount);
  return state.respect;
}

export function respectRank(config, state) {
  let rank = config.respectRanks[0];
  for (const r of config.respectRanks) if (state.respect >= r.at) rank = r;
  return rank;
}

export function setStars(state, n) {
  state.stars = Math.max(0, Math.min(5, n));
  return state.stars;
}

export function damagePlayer(state, amount) {
  let left = amount;
  if (state.armor > 0) {
    const absorbed = Math.min(state.armor, left);
    state.armor -= absorbed;
    left -= absorbed;
  }
  state.health = Math.max(0, state.health - left);
  return state.health;
}

export function healPlayer(state, amount) {
  state.health = Math.min(100, state.health + amount);
  return state.health;
}
