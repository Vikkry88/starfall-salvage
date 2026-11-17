// Starfall Salvage — bootstrap and game loop.
//
// States: title → playing ⇄ upgrade → playing … → gameover | victory.
// Scoring lives here: a pickup pays its value times the combo, kills pay
// their bounty, and the combo grows while pickups keep coming inside the
// combo window. The best haul is kept in localStorage between visits.

import { VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import {
  addFloater,
  burst,
  createWorld,
  resetShip,
  stepWorld,
} from './entities.js';
import {
  drawGameOver,
  drawHint,
  drawHud,
  drawPaused,
  drawTitle,
  drawUpgrade,
  drawVictory,
  upgradeCardRects,
} from './hud.js';
import { createRun, keepFieldStocked, offerUpgrades, quotaFor, startWave, takeUpgrade } from './waves.js';
import { parseShot, stageShot } from './shots.js';

const BEST_KEY = 'starfall-salvage-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or no storage: the best haul just does not persist.
  }
}

function main() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createAudio();
  const renderer = createRenderer(canvas);

  let world = createWorld();
  let run = createRun();
  let state = 'title';
  let best = loadBest();
  let freshBest = false;
  let paused = false;
  let banner = null; // { title, subtitle, alpha, ttl }
  let bannerTimer = 0;

  const staged = parseShot(window.location.search);
  if (staged) {
    const stagedState = stageShot(staged.shot, staged.seed);
    if (stagedState) {
      world = stagedState.world;
      run = stagedState.run;
      state = stagedState.state;
      best = stagedState.best ?? best;
      freshBest = stagedState.freshBest ?? false;
      banner = stagedState.banner ?? null;
      bannerTimer = banner ? (banner.ttl ?? 2.4) : 0;
    }
  } else {
    resetShip(world, {});
  }

  function showBanner(title, subtitle, seconds = 2.2) {
    banner = { title, subtitle, alpha: 0, ttl: seconds };
    bannerTimer = seconds;
  }

  function startGame() {
    world = createWorld();
    run = createRun();
    resetShip(world, {});
    state = 'playing';
    freshBest = false;
    showBanner('WAVE 1', 'Haul 7 salvage to clear the wave');
    startWave(world, run);
    audio.unlock();
    audio.waveClear();
  }

  function clearWave() {
    audio.waveClear();
    if (run.wave >= 8) {
      state = 'victory';
      if (run.score > best) {
        best = run.score;
        freshBest = true;
        saveBest(best);
      }
      audio.victory();
      return;
    }
    run.wave += 1;
    offerUpgrades(world, run);
    state = 'upgrade';
  }

  function endGame() {
    state = 'gameover';
    if (run.score > best) {
      best = run.score;
      freshBest = true;
      saveBest(best);
    }
    audio.gameOver();
  }

  function handleEvents(events) {
    for (const event of events) {
      if (event.type === 'shoot') {
        audio.shoot();
      } else if (event.type === 'pickup') {
        run.combo += 1;
        run.comboTimer = world.ship.comboWindow;
        run.bestCombo = Math.max(run.bestCombo, run.combo);
        const gained = event.crate.value * run.combo;
        run.score += gained;
        run.collected += 1;
        addFloater(world, event.x, event.y - 14, `+${gained}`, '#ffc857');
        if (run.combo >= 3) addFloater(world, event.x, event.y - 34, `COMBO x${run.combo}`, '#ffb37a');
        audio.pickup(run.combo);
        if (run.collected >= quotaFor(run.wave)) clearWave();
      } else if (event.type === 'rock-destroyed') {
        run.kills += 1;
        run.score += event.rock.score;
        addFloater(world, event.x, event.y, `+${event.rock.score}`, '#eaf2ff');
        audio.explosion(event.rock.size === 'large');
      } else if (event.type === 'drone-destroyed') {
        run.kills += 1;
        run.score += event.drone.score;
        addFloater(world, event.x, event.y, `+${event.drone.score}`, '#ff9ebb');
        audio.explosion(false);
      } else if (event.type === 'stolen') {
        run.cratesStolen += 1;
        addFloater(world, event.x, event.y - 14, 'STOLEN!', '#ff5d8f');
      } else if (event.type === 'hit') {
        run.combo = 0;
        run.comboTimer = 0;
        audio.hurt();
      } else if (event.type === 'ship-destroyed') {
        world.shake = 1;
        endGame();
      }
    }
  }

  function chooseUpgrade(index) {
    const upgrade = run.choices[index];
    if (!upgrade) return;
    takeUpgrade(run, world.ship, upgrade);
    audio.upgrade();
    resetShipPositionsForWave();
    state = 'playing';
    showBanner(`WAVE ${run.wave}`, `Haul ${quotaFor(run.wave)} salvage to clear the wave`);
    startWave(world, run);
  }

  function resetShipPositionsForWave() {
    world.ship.x = VIEW.width / 2;
    world.ship.y = VIEW.height / 2;
    world.ship.vx = 0;
    world.ship.vy = 0;
    world.ship.invulnerable = 1.2;
  }

  function onTitleInput() {
    audio.unlock();
    startGame();
  }

  function onEndInput() {
    audio.unlock();
    startGame();
  }

  function clickUpgradeCard() {
    const rects = upgradeCardRects();
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      if (
        input.mouse.x >= rect.x &&
        input.mouse.x <= rect.x + rect.width &&
        input.mouse.y >= rect.y &&
        input.mouse.y <= rect.y + rect.height
      ) {
        chooseUpgrade(i);
        return;
      }
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // One-shot keys.
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (input.wasPressed('KeyP') && (state === 'playing' || paused)) paused = !paused;

    if (state === 'title') {
      if (input.wasPressed('Enter') || input.mouse.clicked) onTitleInput();
    } else if (state === 'upgrade') {
      if (input.wasPressed('Digit1')) chooseUpgrade(0);
      else if (input.wasPressed('Digit2')) chooseUpgrade(1);
      else if (input.wasPressed('Digit3')) chooseUpgrade(2);
      else if (input.mouse.clicked) clickUpgradeCard();
    } else if (state === 'gameover' || state === 'victory') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.mouse.clicked) onEndInput();
    }

    if (state === 'playing' && !paused && !staged) {
      const events = [];
      stepWorld(world, input, dt, events);
      handleEvents(events);
      keepFieldStocked(world, run);
      run.comboTimer = Math.max(0, run.comboTimer - dt);
      if (run.comboTimer <= 0) run.combo = 0;
    }

    if (banner) {
      bannerTimer -= dt;
      const elapsed = (banner.ttl ?? 2.4) - bannerTimer;
      banner.alpha = bannerTimer > 0.4 ? Math.min(1, elapsed * 4) : Math.max(0, bannerTimer / 0.4);
      if (bannerTimer <= 0) banner = null;
    }

    // A staged screenshot renders its one frozen frame; live play renders
    // the same way, one frame at a time.
    renderer.draw(world, run, banner);

    if (state === 'playing' || state === 'upgrade') {
      drawHud(ctx, run, world.ship, audio.muted);
      if (state === 'playing' && !paused) {
        drawHint(ctx, 'WASD thrust · mouse aim · click / Space harpoon · P pause · M sound');
      }
    }
    if (state === 'title') drawTitle(ctx, best);
    if (state === 'upgrade') drawUpgrade(ctx, run);
    if (state === 'playing' && paused) drawPaused(ctx);
    if (state === 'gameover') drawGameOver(ctx, run, best);
    if (state === 'victory') drawVictory(ctx, run);

    input.endFrame();
    requestAnimationFrame(frame);
  }

  // First gesture unlocks audio even before the game starts.
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  requestAnimationFrame(frame);
}

main();
