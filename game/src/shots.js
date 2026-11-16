// Screenshot staging: `?shot=start|play|upgrade|gameover&seed=N` rebuilds
// one exact scene with a seeded RNG, so the screenshots in screenshots/
// are real renders of the game's own code, taken the same way every time.
// `?shot=` never runs during normal play.

import { ASTEROID, VIEW } from './config.js';
import { makeRandom } from './random.js';
import { addFloater, burst, createWorld, resetShip, spawnAsteroid, spawnCrate, spawnDrone } from './entities.js';
import { createRun, offerUpgrades, quotaFor, startWave } from './waves.js';

export function parseShot(search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  if (!shot) return null;
  return { shot, seed: Number(params.get('seed') ?? 1) || 1 };
}

// Build a staged world for the requested shot and hand back the game
// state main.js should start in. Every placement uses the seeded rng.
export function stageShot(shot, seed) {
  const rng = makeRandom(seed * 7919 + 13);
  const world = createWorld(rng);
  const run = createRun();

  if (shot === 'start') {
    resetShip(world, {});
    // A calm field drifting behind the title panel.
    for (let i = 0; i < 5; i += 1) spawnCrate(world);
    for (let i = 0; i < 4; i += 1) spawnAsteroid(world, 'small');
    return { world, run, state: 'title', best: 1840 };
  }

  if (shot === 'play') {
    run.wave = 3;
    run.score = 1250;
    run.combo = 4;
    run.bestCombo = 6;
    run.collected = 5;
    run.comboTimer = 2.2;
    resetShip(world, { pickupRadius: 76 });
    world.ship.x = 300;
    world.ship.y = 330;
    world.ship.angle = -0.5;
    world.ship.hull = 2;
    // A busy mid-wave field: crates, rocks of every size, a drone,
    // a bolt in flight and fresh explosion sparks.
    startWave(world, run);
    run.collected = 5; // startWave resets the wave counter; stage it after.
    world.asteroids = [];
    spawnAsteroid(world, 'large', 640, 180);
    spawnAsteroid(world, 'medium', 760, 420);
    spawnAsteroid(world, 'medium', 180, 150);
    spawnAsteroid(world, 'small', 560, 470);
    spawnAsteroid(world, 'small', 830, 220);
    spawnDrone(world);
    world.drones[0].x = 700;
    world.drones[0].y = 300;
    world.crates = [];
    const crateSpots = [[420, 250], [520, 380], [660, 300], [380, 460], [790, 120], [250, 260], [600, 150]];
    for (const [x, y] of crateSpots) {
      spawnCrate(world);
      const crate = world.crates[world.crates.length - 1];
      crate.x = x;
      crate.y = y;
      crate.vx = 0;
      crate.vy = 0;
    }
    world.bolts.push({ x: 380, y: 320, vx: 620, vy: -90, travelled: 0, range: 420 });
    burst(world, 640, 180, '#ffb37a', 10, 140);
    addFloater(world, 560, 430, '+200', '#ffc857');
    addFloater(world, 700, 260, 'COMBO x4', '#ffb37a');
    return {
      world,
      run,
      state: 'playing',
      best: 1840,
      banner: { title: 'WAVE 3', subtitle: 'Haul the quota — watch the drones', alpha: 0.9, ttl: 10 },
    };
  }

  if (shot === 'upgrade') {
    run.wave = 2;
    run.score = 940;
    run.collected = quotaFor(2);
    run.bestCombo = 5;
    resetShip(world, {});
    world.ship.x = 480;
    world.ship.y = 300;
    offerUpgrades(world, run);
    return { world, run, state: 'upgrade', best: 1840 };
  }

  if (shot === 'gameover') {
    run.wave = 5;
    run.score = 2480;
    run.bestCombo = 9;
    run.kills = 31;
    resetShip(world, {});
    world.ship.alive = false;
    world.ship.x = 480;
    world.ship.y = 300;
    for (let i = 0; i < 4; i += 1) spawnAsteroid(world, 'small');
    burst(world, 480, 300, '#4de3ff', 40, 260);
    burst(world, 480, 300, '#ffffff', 20, 160);
    return { world, run, state: 'gameover', best: 2480, freshBest: true };
  }

  return null;
}

export { ASTEROID, VIEW };
