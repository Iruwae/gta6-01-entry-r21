// SOLMAR BAY — the seven districts. Each one owns a rectangle of the map
// and a look: building height, facade colours and street character.
// districtAt() is the single lookup the rest of the game uses.

import { CONFIG } from './config.js';

const PALETTES = {
  marina: { base: [0xffe3c2, 0xffd9a8, 0xfff1d6], accent: 0x2ec4b6, windows: 0xffe9a8 },
  downtown: { base: [0x9aa3b2, 0x7e8898, 0xb8c0cc], accent: 0x4cc9f0, windows: 0xffe08a },
  neon: { base: [0x6b5b95, 0x8a6fb0, 0x5a4a7a], accent: 0xff2e88, windows: 0xff5da2 },
  shops: { base: [0xf2b880, 0xe89b6a, 0xf7cfa0], accent: 0xff9f1c, windows: 0xfff3b0 },
  hills: { base: [0xe8dcc8, 0xd9c9a8, 0xf0e6d2], accent: 0x80b918, windows: 0xffe9a8 },
  docks: { base: [0x8a7f70, 0x6e6558, 0x9c9184], accent: 0xe07a5f, windows: 0xffd166 },
  suburb: { base: [0xf5d5a8, 0xeec27a, 0xfbe3b8], accent: 0x06d6a0, windows: 0xfff1a8 },
};

export function init(ctx) {
  const districts = CONFIG.districts.map((d) => ({
    ...d,
    palette: PALETTES[d.style] || PALETTES.shops,
  }));

  function districtAt(x, z) {
    for (const d of districts) {
      if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
    }
    return districts[0];
  }

  // Pick a district weighted by area, for random spawns.
  function randomDistrict(rng) {
    const areas = districts.map((d) => (d.x1 - d.x0) * (d.z1 - d.z0));
    const total = areas.reduce((a, b) => a + b, 0);
    let roll = rng() * total;
    for (let i = 0; i < districts.length; i++) {
      roll -= areas[i];
      if (roll <= 0) return districts[i];
    }
    return districts[0];
  }

  const api = { list: districts, districtAt, randomDistrict };
  ctx.districts = api;
  return api;
}
