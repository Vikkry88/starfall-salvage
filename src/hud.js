// The HUD and the menus: title screen, pause, the upgrade choice,
// game over and victory. Everything here is drawn on the same canvas
// the world is painted on, so a screenshot always shows the whole game.

import { PALETTE, VIEW } from './config.js';
import { quotaFor } from './waves.js';

function drawPanel(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hullHearts(ctx, hull, maxHull) {
  // Right-aligned in the top bar, clear of the score on the left.
  for (let i = 0; i < maxHull; i += 1) {
    const x = VIEW.width - 16 - (maxHull - 1 - i) * 26;
    const y = 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = i < hull ? '#ff5d6e' : 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-9, -2, -6, -9, 0, -4);
    ctx.bezierCurveTo(6, -9, 9, -2, 0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawHud(ctx, run, ship, muted) {
  // Top bar.
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, 52);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${run.score.toLocaleString('en-US')}`, 16, 24);
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`WAVE ${run.wave} / 8`, 16, 44);

  // Salvage quota as a row of pips.
  const quota = quotaFor(run.wave);
  for (let i = 0; i < quota; i += 1) {
    const x = 250 + i * 20;
    ctx.save();
    ctx.translate(x, 22);
    ctx.fillStyle = i < run.collected ? PALETTE.salvage : 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SALVAGE ${run.collected}/${quota}`, 250, 44);

  // Combo meter, right of the quota pips.
  if (run.combo > 1) {
    const comboX = 250 + quota * 20 + 18;
    ctx.fillStyle = '#ffb37a';
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${run.combo}`, comboX, 26);
    const width = 90 * Math.max(0, run.comboTimer / (ship?.comboWindow ?? 3));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(comboX, 34, 90, 6);
    ctx.fillStyle = '#ffb37a';
    ctx.fillRect(comboX, 34, width, 6);
  }

  // Hull, top right.
  if (ship) hullHearts(ctx, ship.hull, ship.maxHull);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(muted ? 'M — sound off' : 'M — sound on', VIEW.width - 16, 44);
  ctx.restore();
}

export function drawTitle(ctx, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 22, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.salvage;
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('A  S C R A P  H A U L  I N  T H E  D A R K', VIEW.width / 2, 108);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(77, 227, 255, 0.7)';
  ctx.shadowBlur = 24;
  ctx.fillText('STARFALL SALVAGE', VIEW.width / 2, 176);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Pilot the last salvage skiff. Haul the quota, dodge the rocks,', VIEW.width / 2, 216);
  ctx.fillText('and keep the scavenger drones off your crates.', VIEW.width / 2, 242);

  drawPanel(ctx, VIEW.width / 2 - 250, 272, 500, 148);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW.width / 2, 300);
  ctx.textAlign = 'left';
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  const lines = [
    'WASD / arrows — thrust    ·    Mouse — aim',
    'Click / Space — fire the harpoon',
    'Collect the wave quota of salvage to advance',
    'Chain pickups for a combo — a hit resets it',
    'P — pause    ·    M — sound on/off',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2 - 228, 326 + i * 18));
  ctx.textAlign = 'center';

  ctx.fillStyle = PALETTE.ship;
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('▶  CLICK OR PRESS ENTER TO LAUNCH', VIEW.width / 2, 470);
  if (best > 0) {
    ctx.fillStyle = PALETTE.salvage;
    ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST HAUL: ${best.toLocaleString('en-US')}`, VIEW.width / 2, 506);
  }
  ctx.restore();
}

export function upgradeCardRects() {
  const width = 260;
  const height = 210;
  const gap = 24;
  const total = width * 3 + gap * 2;
  const startX = (VIEW.width - total) / 2;
  const y = 220;
  return [0, 1, 2].map((i) => ({
    x: startX + i * (width + gap),
    y,
    width,
    height,
  }));
}

export function drawUpgrade(ctx, run) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 22, 0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${run.wave} CLEARED`, VIEW.width / 2, 120);
  ctx.fillStyle = PALETTE.salvage;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('The hold is full. Pick one upgrade for the next wave.', VIEW.width / 2, 152);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Click a card — or press 1, 2 or 3', VIEW.width / 2, 178);

  const rects = upgradeCardRects();
  run.choices.forEach((upgrade, i) => {
    const rect = rects[i];
    drawPanel(ctx, rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = PALETTE.ship;
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, rect.x + rect.width / 2, rect.y + 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(upgrade.name, rect.x + rect.width / 2, rect.y + 66, rect.width - 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    wrapText(ctx, upgrade.blurb, rect.x + rect.width / 2, rect.y + 102, rect.width - 36, 21);
  });
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  lines.forEach((item, i) => ctx.fillText(item, x, y + i * lineHeight));
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 22, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 8);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press P to keep flying', VIEW.width / 2, VIEW.height / 2 + 26);
  ctx.restore();
}

export function drawGameOver(ctx, run, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 4, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d6e';
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SKIFF LOST', VIEW.width / 2, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('The salvage field keeps the wreck. The next pilot flies at dawn.', VIEW.width / 2, 228);

  drawPanel(ctx, VIEW.width / 2 - 210, 258, 420, 150);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  const rows = [
    ['FINAL SCORE', run.score.toLocaleString('en-US')],
    ['WAVE REACHED', `${run.wave} / 8`],
    ['BEST COMBO', `x${run.bestCombo}`],
    ['ROCKS & DRONES DOWN', `${run.kills}`],
  ];
  rows.forEach(([label, value], i) => {
    ctx.textAlign = 'left';
    ctx.fillText(label, VIEW.width / 2 - 188, 292 + i * 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, VIEW.width / 2 + 188, 292 + i * 28);
    ctx.fillStyle = PALETTE.muted;
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ship;
  ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('▶  PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 452);
  if (run.score >= best && run.score > 0) {
    ctx.fillStyle = PALETTE.salvage;
    ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('★ NEW BEST HAUL ★', VIEW.width / 2, 488);
  }
  ctx.restore();
}

export function drawVictory(ctx, run) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 18, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.salvage;
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(255, 200, 87, 0.8)';
  ctx.shadowBlur = 24;
  ctx.fillText('SECTOR CLEARED', VIEW.width / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('All eight waves hauled. The skiff comes home heavy —', VIEW.width / 2, 228);
  ctx.fillText('and the field is yours.', VIEW.width / 2, 254);

  drawPanel(ctx, VIEW.width / 2 - 210, 284, 420, 122);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  const rows = [
    ['FINAL SCORE', run.score.toLocaleString('en-US')],
    ['BEST COMBO', `x${run.bestCombo}`],
    ['ROCKS & DRONES DOWN', `${run.kills}`],
    ['UPGRADES FITTED', `${run.upgradesTaken.length}`],
  ];
  rows.forEach(([label, value], i) => {
    ctx.textAlign = 'left';
    ctx.fillText(label, VIEW.width / 2 - 188, 318 + i * 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, VIEW.width / 2 + 188, 318 + i * 28);
    ctx.fillStyle = PALETTE.muted;
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ship;
  ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('▶  PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 452);
  ctx.restore();
}

export function drawHint(ctx, text) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(234, 242, 255, 0.75)';
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(text, VIEW.width / 2, VIEW.height - 16);
  ctx.restore();
}
