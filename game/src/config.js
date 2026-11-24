// SOLMAR BAY — world data. Every name, place, price and stat in the game
// lives here so the other modules stay small and consistent. All content
// is original; the city, districts, people and stations are invented.

export const CONFIG = {
  world: {
    size: 1200,
    landMaxX: 420, // east of this line is the bay
    roadEvery: 100,
    block: 80,
    groundY: 0,
  },

  player: {
    startMoney: 120,
    walkSpeed: 8,
    runSpeed: 13,
    maxHealth: 100,
    startPos: { x: -40, z: 60 },
  },

  districts: [
    { name: 'Marina Bay', x0: 300, z0: -600, x1: 420, z1: 600, style: 'marina', tall: 0.5 },
    { name: 'Vice Row', x0: -200, z0: -600, x1: 300, z1: -200, style: 'downtown', tall: 1.6 },
    { name: 'Neon Mile', x0: -200, z0: -200, x1: 300, z1: 100, style: 'neon', tall: 1.0 },
    { name: 'Coral Court', x0: -200, z0: 100, x1: 300, z1: 600, style: 'shops', tall: 0.8 },
    { name: 'Palmetto Heights', x0: -600, z0: -600, x1: -200, z1: -100, style: 'hills', tall: 0.6 },
    { name: 'Port Solmar', x0: -600, z0: -100, x1: -200, z1: 300, style: 'docks', tall: 0.4 },
    { name: 'Las Palmas', x0: -600, z0: 300, x1: -200, z1: 600, style: 'suburb', tall: 0.4 },
  ],

  respectRanks: [
    { name: 'NOBODY', at: 0 },
    { name: 'SMALL-TIME', at: 150 },
    { name: 'HUSTLER', at: 400 },
    { name: 'SHOT-CALLER', at: 900 },
    { name: 'KINGPIN', at: 1800 },
    { name: 'BAY LEGEND', at: 3500 },
  ],

  weapons: [
    { name: 'Pistol', damage: 25, rate: 0.28, mag: 12, range: 60, spread: 0.01, color: 0xcccccc },
    { name: 'SMG', damage: 15, rate: 0.09, mag: 30, range: 45, spread: 0.05, color: 0x888899 },
    { name: 'Shotgun', damage: 14, rate: 0.8, mag: 6, range: 25, spread: 0.16, color: 0xaa7744, pellets: 6 },
    { name: 'Rifle', damage: 50, rate: 0.16, mag: 20, range: 120, spread: 0.005, color: 0x556655 },
  ],

  radio: [
    { name: 'SOL FM', genre: 'sunset pop', root: 60, scale: [0, 2, 4, 7, 9], bpm: 100, wave: 'triangle' },
    { name: 'BAY 98', genre: 'bay hip-hop', root: 45, scale: [0, 3, 5, 7, 10], bpm: 88, wave: 'sawtooth' },
    { name: 'NEON FM', genre: 'synthwave', root: 57, scale: [0, 2, 3, 7, 8], bpm: 116, wave: 'square' },
    { name: 'PALMA', genre: 'palma latin', root: 62, scale: [0, 2, 4, 5, 7, 9], bpm: 124, wave: 'triangle' },
    { name: 'STATIC', genre: 'garage rock', root: 40, scale: [0, 3, 5, 6, 10], bpm: 140, wave: 'sawtooth' },
    { name: 'TALK 640', genre: 'talk radio', root: 0, scale: [0], bpm: 0, wave: 'none' },
  ],

  missions: [
    { id: 1, title: 'First Errand', giver: 'Vic Torres', pay: 150, brief: 'Drive the sedan to the MART drop-off. Easy money, no heat.' },
    { id: 2, title: 'Hot Wheels', giver: 'Vic Torres', pay: 320, brief: 'Lift a sports car off Coral Court and bring it to the fence.' },
    { id: 3, title: 'Paper Trail', giver: 'Vic Torres', pay: 280, brief: 'Three packages stashed around town. Collect them all.' },
    { id: 4, title: 'Heat Wave', giver: 'Vic Torres', pay: 400, brief: 'The cops are on you. Lose a 2-star tail, then lay low.' },
    { id: 5, title: "Lena's Ride", giver: 'Lena Cruz', pay: 650, brief: 'Crew job. Lena rides shotgun — get her out clean after the grab.' },
    { id: 6, title: 'Taxi Trouble', giver: 'Vic Torres', pay: 350, brief: 'Two fares, one clock. The meter is running.' },
    { id: 7, title: 'Race the Mile', giver: 'Lena Cruz', pay: 700, brief: 'Win the street race down the Neon Mile. No shortcuts, no mercy.' },
    { id: 8, title: 'Night Shift', giver: 'Vic Torres', pay: 500, brief: 'A delivery after dark. Neon on, headlights off.' },
    { id: 9, title: 'Payback', giver: 'Vic Torres', pay: 900, brief: 'Rivals jumped our boys. Settle it — and walk away.' },
    { id: 10, title: 'Bay Legend', giver: 'Vic Torres', pay: 2000, brief: 'Three drops, one long night, three stars on your tail. Make the bay remember your name.' },
  ],

  tuning: {
    engine: [0, 400, 900, 1600],
    armor: [0, 300, 700, 1200],
    paint: [0, 150, 150, 150],
    nos: [0, 500, 1100, 2000],
  },

  shopItems: [
    { name: 'Cafecito', price: 5, heal: 25, desc: 'Sweet Cuban coffee. +25 health.' },
    { name: 'Empanada', price: 8, heal: 40, desc: 'Hot pocket of joy. +40 health.' },
    { name: 'Pistol Ammo', price: 30, ammo: 'Pistol', amount: 24, desc: '+24 pistol rounds.' },
    { name: 'SMG Ammo', price: 45, ammo: 'SMG', amount: 60, desc: '+60 SMG rounds.' },
    { name: 'Body Armor', price: 120, armor: 50, desc: '+50 armor.' },
    { name: 'NOS Canister', price: 200, nos: 1, desc: 'One full NOS refill.' },
  ],

  challenges: [
    { id: 'earn', text: 'Earn $500 today', target: 500, reward: 150, kind: 'earn' },
    { id: 'race', text: 'Win a street race', target: 1, reward: 200, kind: 'race' },
    { id: 'packs', text: 'Collect 5 packages', target: 5, reward: 180, kind: 'packs' },
    { id: 'fares', text: 'Finish 2 taxi fares', target: 2, reward: 160, kind: 'fares' },
    { id: 'clean', text: 'Lose a 2-star wanted level', target: 1, reward: 220, kind: 'clean' },
  ],

  places: {
    mart: { x: 120, z: 240, name: 'MART' },
    safehouse: { x: -320, z: 420, name: 'Safehouse' },
    garage: { x: -260, z: -40, name: 'Garage' },
    fence: { x: -480, z: 120, name: "Vic's Fence" },
    taxiStand: { x: 40, z: -60, name: 'Taxi Stand' },
    racePad: { x: 0, z: -200, name: 'Race Pad' },
    paynspray: { x: 180, z: -240, name: 'Pay-n-Spray' },
  },

  palette: {
    sunset: 0xff9a56,
    dusk: 0x2a1e4f,
    night: 0x0a0e24,
    water: 0x1a5f7a,
    road: 0x2b2b33,
    sidewalk: 0x55555e,
  },
};
