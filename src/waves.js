// The wave director: what each wave asks of the player, what it throws
// at them, and the three upgrade cards offered when a wave is cleared.
// A wave is cleared by collecting its salvage quota — not by destroying
// everything — so the player chooses between harvesting and fighting.

import { UPGRADES, WAVES } from './config.js';
import { shuffle } from './random.js';
import { spawnAsteroid, spawnCrate, spawnDrone } from './entities.js';

export function createRun() {
  return {
    wave: 1,
    score: 0,
    collected: 0, // crates collected this wave
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    kills: 0,
    cratesStolen: 0,
    upgradesTaken: [],
    choices: [], // the three upgrades on offer right now
  };
}

export function quotaFor(wave) {
  return WAVES.quota(wave);
}

export function startWave(world, run) {
  const wave = run.wave;
  run.collected = 0;
  // Clear the field, then seed it: quota crates plus a few spares,
  // asteroids scaled to the wave, drones from wave 3 on.
  world.crates = [];
  world.asteroids = [];
  world.drones = [];
  world.bolts = [];
  const crates = quotaFor(wave) + 3;
  for (let i = 0; i < crates; i += 1) spawnCrate(world);
  const budget = WAVES.asteroidBudget(wave);
  for (let i = 0; i < budget; i += 1) {
    const roll = world.rng();
    spawnAsteroid(world, roll < 0.25 ? 'large' : roll < 0.65 ? 'medium' : 'small');
  }
  for (let i = 0; i < WAVES.droneCount(wave); i += 1) spawnDrone(world);
}

// Keep the pressure on: while a wave runs, top the field back up toward
// its asteroid budget and keep at least the quota's worth of crates out.
export function keepFieldStocked(world, run) {
  const budget = WAVES.asteroidBudget(run.wave);
  const speedScale = WAVES.asteroidSpeedScale(run.wave);
  if (world.asteroids.length < budget && world.rng() < 0.02) {
    spawnAsteroid(world, world.rng() < 0.3 ? 'medium' : 'small');
    const rock = world.asteroids[world.asteroids.length - 1];
    rock.vx *= speedScale;
    rock.vy *= speedScale;
  }
  const needed = quotaFor(run.wave) - run.collected + 2;
  if (world.crates.length < needed && world.rng() < 0.03) spawnCrate(world);
  if (world.drones.length < WAVES.droneCount(run.wave) && world.rng() < 0.008) spawnDrone(world);
}

export function offerUpgrades(world, run) {
  const available = UPGRADES.filter((upgrade) => !run.upgradesTaken.includes(upgrade.id));
  const pool = available.length >= 3 ? available : UPGRADES;
  run.choices = shuffle(world.rng, pool).slice(0, 3);
  return run.choices;
}

export function takeUpgrade(run, ship, upgrade) {
  upgrade.apply(ship);
  run.upgradesTaken.push(upgrade.id);
  run.choices = [];
}
