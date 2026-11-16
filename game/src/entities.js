// The world: everything that moves, and what happens when things meet.
// The ship, harpoon bolts, salvage crates, asteroids, scavenger drones,
// particles and floating score text all live here. No drawing happens
// in this file — render.js reads this state and paints it.

import { ASTEROID, DRONE, SALVAGE, SHIP, VIEW, WAVES } from './config.js';
import { makeRandom, rangeRandom } from './random.js';

function spawnPosition(rng, margin = 40) {
  // Anywhere inside the view, away from the centre where the ship starts.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const x = rangeRandom(rng, margin, VIEW.width - margin);
    const y = rangeRandom(rng, margin, VIEW.height - margin);
    if (Math.hypot(x - VIEW.width / 2, y - VIEW.height / 2) > 180) return { x, y };
  }
  return { x: margin, y: margin };
}

function edgeSpawn(rng) {
  // Just outside one of the four edges, drifting inward.
  const side = Math.floor(rng() * 4);
  const along = rangeRandom(rng, 0, 1);
  if (side === 0) return { x: along * VIEW.width, y: -30, vx: 0, vy: 1 };
  if (side === 1) return { x: along * VIEW.width, y: VIEW.height + 30, vx: 0, vy: -1 };
  if (side === 2) return { x: -30, y: along * VIEW.height, vx: 1, vy: 0 };
  return { x: VIEW.width + 30, y: along * VIEW.height, vx: -1, vy: 0 };
}

export function createWorld(rng) {
  return {
    rng: rng ?? makeRandom((Math.random() * 0xffffffff) >>> 0),
    time: 0,
    ship: null,
    bolts: [],
    crates: [],
    asteroids: [],
    drones: [],
    particles: [],
    floaters: [],
    shake: 0,
  };
}

export function resetShip(world, upgrades) {
  world.ship = {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hull: SHIP.maxHull,
    maxHull: SHIP.maxHull,
    thrust: SHIP.thrust,
    maxSpeed: SHIP.maxSpeed,
    fireCooldown: SHIP.fireCooldown,
    boltRange: SHIP.boltRange,
    pickupRadius: SALVAGE.pickupRadius,
    comboWindow: SALVAGE.comboWindow,
    bolts: 1,
    cooldown: 0,
    invulnerable: 0,
    alive: true,
    ...upgrades,
  };
}

export function spawnCrate(world, nearShip = false) {
  const position = nearShip
    ? { x: rangeRandom(world.rng, 120, VIEW.width - 120), y: rangeRandom(world.rng, 100, VIEW.height - 100) }
    : spawnPosition(world.rng);
  world.crates.push({
    x: position.x,
    y: position.y,
    vx: rangeRandom(world.rng, -SALVAGE.driftSpeed, SALVAGE.driftSpeed),
    vy: rangeRandom(world.rng, -SALVAGE.driftSpeed, SALVAGE.driftSpeed),
    radius: SALVAGE.radius,
    bob: world.rng() * Math.PI * 2,
    value: SALVAGE.baseValue,
  });
}

export function spawnAsteroid(world, size, x = null, y = null) {
  const spec = ASTEROID[size];
  const edge = x === null ? edgeSpawn(world.rng) : { x, y, vx: 0, vy: 0 };
  const speed = spec.speed * rangeRandom(world.rng, 0.8, 1.25);
  const angle = Math.atan2(VIEW.height / 2 - edge.y, VIEW.width / 2 - edge.x) + rangeRandom(world.rng, -0.6, 0.6);
  const vertices = [];
  const points = 9;
  for (let i = 0; i < points; i += 1) {
    vertices.push(rangeRandom(world.rng, 0.72, 1.18));
  }
  world.asteroids.push({
    size,
    x: edge.x,
    y: edge.y,
    vx: Math.cos(angle) * speed + (edge.vx || 0) * speed,
    vy: Math.sin(angle) * speed + (edge.vy || 0) * speed,
    radius: spec.radius,
    score: spec.score,
    rotation: world.rng() * Math.PI * 2,
    spin: rangeRandom(world.rng, -ASTEROID.spin, ASTEROID.spin),
    vertices,
    hits: size === 'large' ? 3 : size === 'medium' ? 2 : 1,
  });
}

export function spawnDrone(world) {
  const edge = edgeSpawn(world.rng);
  world.drones.push({
    x: edge.x,
    y: edge.y,
    vx: 0,
    vy: 0,
    radius: DRONE.radius,
    score: DRONE.score,
    wobble: world.rng() * Math.PI * 2,
  });
}

export function burst(world, x, y, color, count, speed = 160) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const velocity = rangeRandom(world.rng, speed * 0.25, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: rangeRandom(world.rng, 0.35, 0.8),
      maxLife: 0.8,
      size: rangeRandom(world.rng, 1.5, 3.5),
      color,
    });
  }
}

export function addFloater(world, x, y, text, color = '#eaf2ff') {
  world.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function fireBolt(world, ship) {
  const spread = ship.bolts > 1 ? 0.14 : 0;
  const offsets = ship.bolts === 1 ? [0] : [-spread, spread];
  for (const offset of offsets) {
    const angle = ship.angle + offset;
    world.bolts.push({
      x: ship.x + Math.cos(angle) * (SHIP.radius + 8),
      y: ship.y + Math.sin(angle) * (SHIP.radius + 8),
      vx: Math.cos(angle) * SHIP.boltSpeed + ship.vx * 0.3,
      vy: Math.sin(angle) * SHIP.boltSpeed + ship.vy * 0.3,
      travelled: 0,
      range: ship.boltRange,
    });
  }
}

// One fixed step of the world. `events` collects what happened this step
// (pickups, kills, hits) so main.js can score them and play sounds.
export function stepWorld(world, input, dt, events) {
  const ship = world.ship;
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 2.2);

  if (ship && ship.alive) {
    // Aim the nose at the mouse, smoothly.
    const target = Math.atan2(input.mouse.y - ship.y, input.mouse.x - ship.x);
    let diff = target - ship.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = SHIP.turnRate * dt;
    ship.angle += Math.max(-turn, Math.min(turn, diff));

    const thrust = input.thrustVector();
    ship.vx += thrust.x * ship.thrust * dt;
    ship.vy += thrust.y * ship.thrust * dt;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > ship.maxSpeed) {
      ship.vx = (ship.vx / speed) * ship.maxSpeed;
      ship.vy = (ship.vy / speed) * ship.maxSpeed;
    }
    if (thrust.x === 0 && thrust.y === 0) {
      const damp = Math.pow(SHIP.drag, dt * 60);
      ship.vx *= damp;
      ship.vy *= damp;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = Math.max(SHIP.radius, Math.min(VIEW.width - SHIP.radius, ship.x));
    ship.y = Math.max(SHIP.radius, Math.min(VIEW.height - SHIP.radius, ship.y));
    ship.cooldown = Math.max(0, ship.cooldown - dt);
    ship.invulnerable = Math.max(0, ship.invulnerable - dt);

    if (input.firing() && ship.cooldown <= 0) {
      fireBolt(world, ship);
      ship.cooldown = ship.fireCooldown;
      events.push({ type: 'shoot' });
    }
    if ((thrust.x !== 0 || thrust.y !== 0) && world.rng() < 0.5) {
      world.particles.push({
        x: ship.x - Math.cos(ship.angle) * SHIP.radius,
        y: ship.y - Math.sin(ship.angle) * SHIP.radius,
        vx: -Math.cos(ship.angle) * 90 + rangeRandom(world.rng, -20, 20),
        vy: -Math.sin(ship.angle) * 90 + rangeRandom(world.rng, -20, 20),
        life: 0.3,
        maxLife: 0.3,
        size: 2,
        color: '#4de3ff',
      });
    }
  }

  // Bolts fly straight and die at the end of their line.
  for (let i = world.bolts.length - 1; i >= 0; i -= 1) {
    const bolt = world.bolts[i];
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.travelled += Math.hypot(bolt.vx, bolt.vy) * dt;
    if (bolt.travelled > bolt.range || bolt.x < 0 || bolt.x > VIEW.width || bolt.y < 0 || bolt.y > VIEW.height) {
      world.bolts.splice(i, 1);
    }
  }

  // Crates drift, and a magnet coil reels them toward the ship.
  for (const crate of world.crates) {
    crate.bob += dt * 2;
    if (ship && ship.alive) {
      const dx = ship.x - crate.x;
      const dy = ship.y - crate.y;
      const distance = Math.hypot(dx, dy);
      if (distance < ship.pickupRadius * 3.2 && distance > 1) {
        const pull = (1 - distance / (ship.pickupRadius * 3.2)) * 260;
        crate.vx += (dx / distance) * pull * dt;
        crate.vy += (dy / distance) * pull * dt;
      }
    }
    crate.x += crate.vx * dt;
    crate.y += crate.vy * dt;
    if (crate.x < crate.radius || crate.x > VIEW.width - crate.radius) crate.vx *= -1;
    if (crate.y < crate.radius || crate.y > VIEW.height - crate.radius) crate.vy *= -1;
    crate.x = Math.max(crate.radius, Math.min(VIEW.width - crate.radius, crate.x));
    crate.y = Math.max(crate.radius, Math.min(VIEW.height - crate.radius, crate.y));
  }

  // Asteroids tumble across the field and wrap around the edges.
  for (const rock of world.asteroids) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.rotation += rock.spin * dt;
    const margin = rock.radius + 30;
    if (rock.x < -margin) rock.x = VIEW.width + margin;
    if (rock.x > VIEW.width + margin) rock.x = -margin;
    if (rock.y < -margin) rock.y = VIEW.height + margin;
    if (rock.y > VIEW.height + margin) rock.y = -margin;
  }

  // Drones hunt the nearest crate; if none is near, they drift at the ship.
  for (const drone of world.drones) {
    drone.wobble += dt * 3;
    let target = null;
    let best = Infinity;
    for (const crate of world.crates) {
      const distance = Math.hypot(crate.x - drone.x, crate.y - drone.y);
      if (distance < best) {
        best = distance;
        target = crate;
      }
    }
    const aim = target ?? ship;
    if (aim) {
      const dx = aim.x - drone.x;
      const dy = aim.y - drone.y;
      const distance = Math.hypot(dx, dy) || 1;
      const wobble = Math.sin(drone.wobble) * 0.4;
      drone.vx += ((dx / distance) * DRONE.speed + Math.cos(drone.wobble) * 20 * wobble - drone.vx) * dt * 2;
      drone.vy += ((dy / distance) * DRONE.speed + Math.sin(drone.wobble) * 20 * wobble - drone.vy) * dt * 2;
    }
    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;
  }

  // Drones eat crates they reach.
  for (let i = world.drones.length - 1; i >= 0; i -= 1) {
    const drone = world.drones[i];
    for (let j = world.crates.length - 1; j >= 0; j -= 1) {
      const crate = world.crates[j];
      if (Math.hypot(crate.x - drone.x, crate.y - drone.y) < DRONE.stealRadius) {
        world.crates.splice(j, 1);
        burst(world, crate.x, crate.y, '#ff5d8f', 10, 120);
        events.push({ type: 'stolen', x: crate.x, y: crate.y });
        break;
      }
    }
  }

  // Bolts versus asteroids and drones.
  for (let i = world.bolts.length - 1; i >= 0; i -= 1) {
    const bolt = world.bolts[i];
    let spent = false;
    for (let j = world.asteroids.length - 1; j >= 0 && !spent; j -= 1) {
      const rock = world.asteroids[j];
      if (Math.hypot(bolt.x - rock.x, bolt.y - rock.y) < rock.radius + 4) {
        spent = true;
        rock.hits -= 1;
        burst(world, bolt.x, bolt.y, '#ffb37a', 8, 140);
        if (rock.hits <= 0) {
          world.asteroids.splice(j, 1);
          burst(world, rock.x, rock.y, '#b0703c', rock.size === 'large' ? 26 : 16, 220);
          events.push({ type: 'rock-destroyed', rock, x: rock.x, y: rock.y });
          if (rock.size === 'large') {
            spawnAsteroid(world, 'medium', rock.x - 10, rock.y);
            spawnAsteroid(world, 'medium', rock.x + 10, rock.y);
          } else if (rock.size === 'medium') {
            spawnAsteroid(world, 'small', rock.x - 8, rock.y);
            spawnAsteroid(world, 'small', rock.x + 8, rock.y);
          }
        }
      }
    }
    for (let j = world.drones.length - 1; j >= 0 && !spent; j -= 1) {
      const drone = world.drones[j];
      if (Math.hypot(bolt.x - drone.x, bolt.y - drone.y) < drone.radius + 4) {
        spent = true;
        world.drones.splice(j, 1);
        burst(world, drone.x, drone.y, '#ff5d8f', 22, 220);
        events.push({ type: 'drone-destroyed', drone, x: drone.x, y: drone.y });
      }
    }
    if (spent) world.bolts.splice(i, 1);
  }

  // Ship versus crates: pick them up.
  if (ship && ship.alive) {
    for (let i = world.crates.length - 1; i >= 0; i -= 1) {
      const crate = world.crates[i];
      if (Math.hypot(crate.x - ship.x, crate.y - ship.y) < ship.pickupRadius + crate.radius) {
        world.crates.splice(i, 1);
        burst(world, crate.x, crate.y, '#ffc857', 14, 150);
        events.push({ type: 'pickup', crate, x: crate.x, y: crate.y });
      }
    }
  }

  // Ship versus asteroids and drones: a hit costs one hull.
  if (ship && ship.alive && ship.invulnerable <= 0) {
    for (const rock of world.asteroids) {
      if (Math.hypot(rock.x - ship.x, rock.y - ship.y) < rock.radius + SHIP.radius - 4) {
        ship.hull -= 1;
        ship.invulnerable = SHIP.invulnerableSeconds;
        world.shake = 1;
        burst(world, ship.x, ship.y, '#ff5d5d', 24, 260);
        // Shove the ship away from the rock so it is not hit twice at once.
        const dx = ship.x - rock.x;
        const dy = ship.y - rock.y;
        const distance = Math.hypot(dx, dy) || 1;
        ship.vx = (dx / distance) * 320;
        ship.vy = (dy / distance) * 320;
        events.push({ type: 'hit', x: ship.x, y: ship.y });
        if (ship.hull <= 0) {
          ship.alive = false;
          burst(world, ship.x, ship.y, '#4de3ff', 60, 320);
          burst(world, ship.x, ship.y, '#ffffff', 30, 200);
          events.push({ type: 'ship-destroyed', x: ship.x, y: ship.y });
        }
        break;
      }
    }
  }
  if (ship && ship.alive && ship.invulnerable <= 0) {
    for (let i = world.drones.length - 1; i >= 0; i -= 1) {
      const drone = world.drones[i];
      if (Math.hypot(drone.x - ship.x, drone.y - ship.y) < drone.radius + SHIP.radius - 2) {
        world.drones.splice(i, 1);
        ship.hull -= 1;
        ship.invulnerable = SHIP.invulnerableSeconds;
        world.shake = 1;
        burst(world, drone.x, drone.y, '#ff5d8f', 24, 260);
        events.push({ type: 'hit', x: ship.x, y: ship.y });
        if (ship.hull <= 0) {
          ship.alive = false;
          burst(world, ship.x, ship.y, '#4de3ff', 60, 320);
          events.push({ type: 'ship-destroyed', x: ship.x, y: ship.y });
        }
        break;
      }
    }
  }

  // Particles and floating text fade out.
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const particle = world.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
    const floater = world.floaters[i];
    floater.y -= 34 * dt;
    floater.life -= dt;
    if (floater.life <= 0) world.floaters.splice(i, 1);
  }
}

export { WAVES };
