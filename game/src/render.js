// Everything the player sees: the nebula backdrop, the starfield, the
// ship, crates, asteroids, drones, bolts, particles, and the wave banner.
// Menus and the HUD live in hud.js; this file paints the world itself.

import { PALETTE, VIEW } from './config.js';
import { makeRandom, rangeRandom } from './random.js';

function makeStars(seed, count, width, height) {
  const rng = makeRandom(seed);
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: rng() * width,
      y: rng() * height,
      size: rangeRandom(rng, 0.6, 2.1),
      twinkle: rangeRandom(rng, 0, Math.PI * 2),
      layer: 1 + Math.floor(rng() * 3),
    });
  }
  return stars;
}

function makeNebula(seed) {
  const rng = makeRandom(seed);
  const blobs = [];
  const colors = ['rgba(88, 60, 180, 0.20)', 'rgba(24, 120, 160, 0.16)', 'rgba(180, 60, 110, 0.13)'];
  for (let i = 0; i < 7; i += 1) {
    blobs.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      radius: rangeRandom(rng, 120, 260),
      color: colors[i % colors.length],
    });
  }
  return blobs;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = makeStars(1337, 150, VIEW.width, VIEW.height);
  const nebula = makeNebula(777);
  // The backdrop is painted once to an offscreen canvas: gradient,
  // nebula blobs and a faint grid of distant stars.
  const backdrop = document.createElement('canvas');
  backdrop.width = VIEW.width;
  backdrop.height = VIEW.height;
  const bctx = backdrop.getContext('2d');
  const gradient = bctx.createLinearGradient(0, 0, 0, VIEW.height);
  gradient.addColorStop(0, PALETTE.backgroundTop);
  gradient.addColorStop(1, PALETTE.backgroundBottom);
  bctx.fillStyle = gradient;
  bctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (const blob of nebula) {
    const radial = bctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
    radial.addColorStop(0, blob.color);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bctx.fillStyle = radial;
    bctx.fillRect(blob.x - blob.radius, blob.y - blob.radius, blob.radius * 2, blob.radius * 2);
  }

  return {
    draw(world, run, banner) {
      ctx.save();
      if (world.shake > 0) {
        const magnitude = world.shake * 7;
        ctx.translate((world.rng() - 0.5) * magnitude, (world.rng() - 0.5) * magnitude);
      }
      ctx.drawImage(backdrop, 0, 0);

      // Parallax starfield, twinkling gently.
      for (const star of stars) {
        const alpha = 0.45 + 0.4 * Math.sin(world.time * 1.4 + star.twinkle);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = PALETTE.star;
        const size = star.size * (star.layer === 1 ? 0.8 : star.layer === 2 ? 1 : 1.3);
        ctx.fillRect(star.x, star.y, size, size);
      }
      ctx.globalAlpha = 1;

      for (const crate of world.crates) this.drawCrate(crate);
      for (const rock of world.asteroids) this.drawAsteroid(rock);
      for (const drone of world.drones) this.drawDrone(drone);
      for (const bolt of world.bolts) this.drawBolt(bolt);
      if (world.ship && world.ship.alive) this.drawShip(world.ship);
      this.drawParticles(world.particles);
      this.drawFloaters(world.floaters);
      if (banner) this.drawBanner(banner);
      ctx.restore();
    },

    drawShip(ship) {
      // Blink while invulnerable so the player can see the grace period.
      if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 10) % 2 === 0) return;
      const ctx2 = ctx;
      ctx2.save();
      ctx2.translate(ship.x, ship.y);
      ctx2.rotate(ship.angle);
      ctx2.shadowColor = PALETTE.shipGlow;
      ctx2.shadowBlur = 14;
      ctx2.fillStyle = PALETTE.ship;
      ctx2.beginPath();
      ctx2.moveTo(18, 0);
      ctx2.lineTo(-11, -11);
      ctx2.lineTo(-6, 0);
      ctx2.lineTo(-11, 11);
      ctx2.closePath();
      ctx2.fill();
      ctx2.shadowBlur = 0;
      ctx2.fillStyle = '#0b1030';
      ctx2.beginPath();
      ctx2.arc(3, 0, 4.5, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();

      // Magnet radius, faintly, when the coil is fitted.
      if (ship.pickupRadius > 34) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = PALETTE.ship;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.pickupRadius * 3.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },

    drawCrate(crate) {
      const bob = Math.sin(crate.bob) * 2;
      ctx.save();
      ctx.translate(crate.x, crate.y + bob);
      ctx.rotate(Math.sin(crate.bob * 0.7) * 0.25);
      ctx.shadowColor = PALETTE.salvageGlow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALETTE.salvage;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#7a4d12';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();
    },

    drawAsteroid(rock) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rotation);
      ctx.beginPath();
      const points = rock.vertices.length;
      for (let i = 0; i < points; i += 1) {
        const angle = (i / points) * Math.PI * 2;
        const radius = rock.radius * rock.vertices[i];
        if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fillStyle = PALETTE.asteroid;
      ctx.fill();
      ctx.strokeStyle = PALETTE.asteroidDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cracks show how many hits a big rock still has left.
      ctx.strokeStyle = 'rgba(30, 16, 8, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-rock.radius * 0.4, -rock.radius * 0.2);
      ctx.lineTo(0, rock.radius * 0.25);
      ctx.lineTo(rock.radius * 0.4, -rock.radius * 0.1);
      ctx.stroke();
      ctx.restore();
    },

    drawDrone(drone) {
      ctx.save();
      ctx.translate(drone.x, drone.y);
      ctx.shadowColor = PALETTE.drone;
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.drone;
      ctx.beginPath();
      ctx.arc(0, 0, drone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2b0a1a';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9ebb';
      ctx.beginPath();
      ctx.arc(-3, -3, 2, 0, Math.PI * 2);
      ctx.arc(3, -3, 2, 0, Math.PI * 2);
      ctx.fill();
      // Little claw arms, reaching for crates.
      ctx.strokeStyle = PALETTE.drone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-drone.radius, 6);
      ctx.lineTo(-drone.radius - 6, 12);
      ctx.moveTo(drone.radius, 6);
      ctx.lineTo(drone.radius + 6, 12);
      ctx.stroke();
      ctx.restore();
    },

    drawBolt(bolt) {
      ctx.save();
      ctx.strokeStyle = PALETTE.bolt;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = PALETTE.bolt;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(bolt.x - bolt.vx * 0.02, bolt.y - bolt.vy * 0.02);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.restore();
    },

    drawParticles(particles) {
      ctx.save();
      for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      }
      ctx.restore();
    },

    drawFloaters(floaters) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      for (const floater of floaters) {
        ctx.globalAlpha = Math.max(0, floater.life / floater.maxLife);
        ctx.fillStyle = floater.color;
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      ctx.restore();
    },

    drawBanner(banner) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, banner.alpha);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
      ctx.shadowColor = 'rgba(77, 227, 255, 0.8)';
      ctx.shadowBlur = 18;
      ctx.fillText(banner.title, VIEW.width / 2, VIEW.height / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.font = '18px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(banner.subtitle, VIEW.width / 2, VIEW.height / 2 + 24);
      ctx.restore();
    },
  };
}
