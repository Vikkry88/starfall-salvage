// Starfall Salvage — tuning constants.
//
// One place for every number that shapes how the game feels. Nothing here
// is read from anywhere else: change a value and the whole game retunes.

export const VIEW = {
  width: 960,
  height: 600,
};

export const SHIP = {
  radius: 14,
  thrust: 620, // acceleration, px/s^2
  maxSpeed: 340, // px/s
  drag: 0.9, // velocity retained per second when not thrusting (applied as damping)
  turnRate: 9, // radians/s the nose chases the mouse
  fireCooldown: 0.22, // seconds between harpoon bolts
  boltSpeed: 620,
  boltRange: 420,
  invulnerableSeconds: 1.6,
  maxHull: 3,
};

export const SALVAGE = {
  radius: 11,
  baseValue: 50,
  driftSpeed: 26,
  comboWindow: 3.0, // seconds a pickup keeps the combo alive
  pickupRadius: 30, // base; Magnet Coil grows it
};

export const ASTEROID = {
  small: { radius: 13, score: 40, speed: 70 },
  medium: { radius: 22, score: 80, speed: 48 },
  large: { radius: 36, score: 140, speed: 30 },
  spin: 1.6, // max rad/s
};

export const DRONE = {
  radius: 13,
  speed: 95,
  score: 120,
  stealRadius: 26, // how close it must get to eat a salvage crate
};

export const WAVES = {
  total: 8,
  quota: (wave) => 5 + wave * 2, // salvage crates to collect to clear the wave
  asteroidBudget: (wave) => 3 + wave * 2, // asteroids alive at once, roughly
  droneCount: (wave) => (wave >= 3 ? Math.min(wave - 1, 4) : 0),
  asteroidSpeedScale: (wave) => 1 + (wave - 1) * 0.07,
};

// One of three upgrade cards offered after every cleared wave.
export const UPGRADES = [
  {
    id: 'twin-harpoon',
    name: 'Twin Harpoon',
    blurb: 'Fire two bolts at once, fanned slightly apart.',
    apply: (ship) => { ship.bolts = 2; },
  },
  {
    id: 'rapid-cycler',
    name: 'Rapid Cycler',
    blurb: 'Harpoon recharges 40% faster.',
    apply: (ship) => { ship.fireCooldown *= 0.6; },
  },
  {
    id: 'magnet-coil',
    name: 'Magnet Coil',
    blurb: 'Salvage drifts toward you from much further away.',
    apply: (ship) => { ship.pickupRadius += 46; },
  },
  {
    id: 'plating',
    name: 'Hull Plating',
    blurb: '+1 max hull and repair 1 hull right now.',
    apply: (ship) => { ship.maxHull += 1; ship.hull = Math.min(ship.maxHull, ship.hull + 1); },
  },
  {
    id: 'thrusters',
    name: 'Ion Thrusters',
    blurb: '+25% top speed and stronger thrust.',
    apply: (ship) => { ship.maxSpeed *= 1.25; ship.thrust *= 1.2; },
  },
  {
    id: 'combo-extender',
    name: 'Combo Extender',
    blurb: 'The combo timer lasts 5 seconds instead of 3.',
    apply: (ship) => { ship.comboWindow = 5; },
  },
  {
    id: 'long-line',
    name: 'Long Line',
    blurb: 'Harpoon bolts fly 45% further.',
    apply: (ship) => { ship.boltRange *= 1.45; },
  },
];

export const PALETTE = {
  backgroundTop: '#0b1030',
  backgroundBottom: '#1a0f38',
  star: '#cfe4ff',
  ship: '#4de3ff',
  shipGlow: '#1899bb',
  salvage: '#ffc857',
  salvageGlow: '#ff9d2e',
  asteroid: '#b0703c',
  asteroidDark: '#6e4526',
  drone: '#ff5d8f',
  bolt: '#aef7ff',
  text: '#eaf2ff',
  muted: '#9db1d8',
  danger: '#ff5d5d',
  panel: 'rgba(10, 16, 44, 0.82)',
  panelEdge: 'rgba(120, 170, 255, 0.35)',
};
