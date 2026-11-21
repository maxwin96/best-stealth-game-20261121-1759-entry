// The Velvet Fox — all canvas drawing: the museum floor, walls,
// cover props, vision cones, the fox, the guards, the loot, the
// exit door, the HUD and the title / win / caught screens.
// Nothing here changes the game rules; it only shows them.

import {
  ALARM_MAX,
  COVER_PROPS,
  GUARD_VIEW_DISTANCE,
  GUARD_VIEW_HALF_ANGLE,
  isWallTile,
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { angleDiff, hasLineOfSight } from './world.js';

// A warm night-museum palette: dark marble, gold trim, velvet red.
const COLORS = {
  floorA: '#2b2620',
  floorB: '#332c24',
  floorLine: '#453b2e',
  wall: '#171310',
  wallTop: '#4a3a28',
  gold: '#d4af37',
  goldDim: '#8a6d1f',
  pedestal: '#5d4a2f',
  plant: '#2e5d33',
  statue: '#9a938a',
  bench: '#6b4a2f',
  exit: '#27ae60',
  exitLocked: '#7f8c8d',
  fox: '#e67e22',
  foxBelly: '#fdf2e9',
  cone: 'rgba(241, 196, 15, 0.20)',
  coneHot: 'rgba(231, 76, 60, 0.28)',
  hudBg: 'rgba(10, 8, 6, 0.82)',
  text: '#f5eeda',
  textDim: '#c9b896',
};

/** Draw the marble floor as a checker of large tiles with grout lines. */
function drawFloor(ctx) {
  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
  // A red carpet runner down the middle hall, for orientation.
  ctx.fillStyle = 'rgba(120, 20, 30, 0.55)';
  ctx.fillRect(11 * TILE, TILE, 2 * TILE, 14 * TILE);
  ctx.strokeStyle = COLORS.goldDim;
  ctx.lineWidth = 2;
  ctx.strokeRect(11 * TILE, TILE, 2 * TILE, 14 * TILE);
}

/** Draw walls with a gold-trimmed top edge so they read at a glance. */
function drawWalls(ctx) {
  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      if (!isWallTile(tx, ty)) continue;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, 5);
      ctx.strokeStyle = '#00000055';
      ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
}

/** Draw one cover prop: pedestal, plant, statue or bench. */
function drawProp(ctx, prop) {
  const cx = prop.x * TILE + TILE / 2;
  const cy = prop.y * TILE + TILE / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (prop.kind === 'pedestal') {
    ctx.fillStyle = '#241a10';
    ctx.fillRect(-19, -19, 38, 38);
    ctx.fillStyle = COLORS.pedestal;
    ctx.fillRect(-15, -15, 30, 30);
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(0, -2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-15, -15, 30, 4);
  } else if (prop.kind === 'plant') {
    ctx.fillStyle = '#3d2c1c';
    ctx.fillRect(-13, 4, 26, 14);
    ctx.fillStyle = COLORS.plant;
    ctx.beginPath();
    ctx.arc(-8, -8, 12, 0, Math.PI * 2);
    ctx.arc(8, -10, 11, 0, Math.PI * 2);
    ctx.arc(0, -16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4c8a52';
    ctx.beginPath();
    ctx.arc(-4, -12, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'statue') {
    ctx.fillStyle = '#221a12';
    ctx.fillRect(-17, -17, 34, 34);
    ctx.fillStyle = COLORS.statue;
    ctx.beginPath();
    ctx.arc(0, -6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, 2, 16, 14);
    ctx.fillStyle = '#7a726a';
    ctx.fillRect(-14, 14, 28, 4);
  } else {
    // bench
    ctx.fillStyle = '#2c1e12';
    ctx.fillRect(-19, -12, 38, 24);
    ctx.fillStyle = COLORS.bench;
    ctx.fillRect(-17, -10, 34, 20);
    ctx.fillStyle = COLORS.goldDim;
    ctx.fillRect(-17, -2, 34, 3);
  }
  ctx.restore();
}

/** Draw one guard's vision cone, clipped by walls and cover. */
function drawVisionCone(ctx, guard) {
  const steps = 26;
  const startAngle = guard.facing - GUARD_VIEW_HALF_ANGLE;
  const endAngle = guard.facing + GUARD_VIEW_HALF_ANGLE;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    // March out along the ray until something blocks the view.
    let reach = GUARD_VIEW_DISTANCE;
    for (let d = 12; d <= GUARD_VIEW_DISTANCE; d += 8) {
      const px = guard.x + Math.cos(angle) * d;
      const py = guard.y + Math.sin(angle) * d;
      if (!hasLineOfSight(guard.x, guard.y, px, py)) {
        reach = d;
        break;
      }
    }
    ctx.lineTo(guard.x + Math.cos(angle) * reach, guard.y + Math.sin(angle) * reach);
  }
  ctx.closePath();
  const hot = guard.mode === 'chase' || guard.suspicion > 70;
  ctx.fillStyle = hot ? COLORS.coneHot : COLORS.cone;
  ctx.fill();
  ctx.strokeStyle = hot ? 'rgba(231, 76, 60, 0.55)' : 'rgba(241, 196, 15, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Draw a guard: a uniformed body, a cap, a facing tick and a "!" when alarmed. */
function drawGuard(ctx, guard) {
  drawVisionCone(ctx, guard);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = guard.color;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00000088';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cap brim pointing where the guard looks.
  ctx.rotate(guard.facing);
  ctx.fillStyle = '#f5eeda';
  ctx.beginPath();
  ctx.arc(10, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -2, 10, 4);
  ctx.restore();
  // Suspicion ring above the guard.
  if (guard.suspicion > 2 && guard.mode !== 'chase') {
    const w = 30;
    const y = guard.y - 26;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(guard.x - w / 2, y, w, 5);
    ctx.fillStyle = guard.suspicion > 70 ? '#e74c3c' : '#f1c40f';
    ctx.fillRect(guard.x - w / 2, y, (w * guard.suspicion) / 100, 5);
  }
  if (guard.mode === 'chase') {
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5b4d';
    ctx.fillText('!', guard.x, guard.y - 24);
  } else if (guard.mode === 'investigate') {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('?', guard.x, guard.y - 24);
  }
  // Name tag, small, so patrols are easy to learn.
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245, 238, 218, 0.85)';
  ctx.fillText(guard.name, guard.x, guard.y + 28);
}

/** Draw the fox thief: orange body, white chest, ears and a tail. */
function drawPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail, wagging opposite the facing.
  const wag = Math.sin(performance.now() / 180) * 3;
  ctx.rotate(player.facing);
  ctx.fillStyle = '#d35400';
  ctx.beginPath();
  ctx.ellipse(-16, wag, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdf2e9';
  ctx.beginPath();
  ctx.ellipse(-23, wag, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(-player.facing);
  // Ears.
  ctx.fillStyle = COLORS.fox;
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(-11, -20);
  ctx.lineTo(-1, -13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -10);
  ctx.lineTo(11, -20);
  ctx.lineTo(1, -13);
  ctx.closePath();
  ctx.fill();
  // Body and chest.
  ctx.fillStyle = COLORS.fox;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.foxBelly;
  ctx.beginPath();
  ctx.arc(4, 3, 7, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look where the fox faces.
  const ex = Math.cos(player.facing) * 4;
  const ey = Math.sin(player.facing) * 4;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-4 + ex, -4 + ey, 2.2, 0, Math.PI * 2);
  ctx.arc(4 + ex, -4 + ey, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aed6f1';
    ctx.fillText('sneaking', player.x, player.y - 22);
  }
}

/** Draw the loot: a big sparkling sapphire and smaller gems and coins. */
function drawLoot(ctx, item, time) {
  if (item.taken) return;
  const bob = Math.sin(time * 2 + item.bob) * 3;
  const x = item.x;
  const y = item.y + bob;
  ctx.save();
  ctx.translate(x, y);
  if (item.kind === 'sapphire') {
    // Glow so the target reads from across the room.
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    glow.addColorStop(0, 'rgba(93, 173, 226, 0.55)');
    glow.addColorStop(1, 'rgba(93, 173, 226, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5dade2';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(11, -3);
    ctx.lineTo(8, 10);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-11, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d6eaf8';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(6, -3);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d6eaf8';
    ctx.fillText('STAR SAPPHIRE', 0, 30);
  } else if (item.kind === 'coin') {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b7950b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 3.5);
  } else {
    const color = item.kind === 'ruby' ? '#e74c3c' : item.kind === 'emerald' ? '#2ecc71' : '#f8f9f9';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 9);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(4, -2);
    ctx.lineTo(0, 1);
    ctx.lineTo(-4, -2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Draw the exit door: locked grey, unlocked green, open when won. */
function drawExit(ctx, exit) {
  ctx.save();
  ctx.translate(exit.x, exit.y);
  const color = exit.unlocked ? COLORS.exit : COLORS.exitLocked;
  if (exit.unlocked) {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    glow.addColorStop(0, 'rgba(39, 174, 96, 0.5)');
    glow.addColorStop(1, 'rgba(39, 174, 96, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1c1a17';
  ctx.fillRect(-18, -18, 36, 36);
  ctx.fillStyle = color;
  ctx.fillRect(-14, -14, 28, 28);
  ctx.fillStyle = '#f5eeda';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(exit.unlocked ? 'EXIT' : 'LOCK', 0, 4);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#f5eeda';
  ctx.fillText(exit.unlocked ? 'get out!' : 'needs the gem', 0, 32);
  ctx.restore();
}

/** Draw a thrown pebble and its ripple. */
function drawPebbles(ctx, pebbles) {
  for (const pebble of pebbles) {
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(189, 195, 199, 0.6)';
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, 4 + pebble.age * 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- HUD

function drawHud(ctx, world) {
  const pad = 12;
  const barW = 220;
  const barH = 16;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_WIDTH, 52);
  ctx.fillStyle = COLORS.goldDim;
  ctx.fillRect(0, 52, VIEW_WIDTH, 2);

  // Alarm meter.
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('ALARM', pad, 21);
  const alarmRatio = world.alarm / ALARM_MAX;
  ctx.fillStyle = '#3a2a22';
  ctx.fillRect(70, 8, barW, barH);
  const alarmColor = alarmRatio > 0.7 ? '#e74c3c' : alarmRatio > 0.4 ? '#f39c12' : '#2ecc71';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(70, 8, barW * alarmRatio, barH);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(70.5, 8.5, barW - 1, barH - 1);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${Math.round(world.alarm)}%`, 70 + barW + 8, 21);

  // Loot, score and timer.
  ctx.fillText(`LOOT ${world.lootTaken}/${world.lootTotal}`, 330, 21);
  ctx.fillText(`SCORE ${world.score}`, 450, 21);
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, 580, 21);

  // Objective line.
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  const objective = world.sapphireTaken
    ? 'Objective: reach the green EXIT unseen!'
    : 'Objective: steal the STAR SAPPHIRE, then reach the EXIT.';
  ctx.fillText(objective, pad, 44);

  // Recent events feed, bottom-left.
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  world.feed.forEach((line, i) => {
    ctx.fillStyle = `rgba(245, 238, 218, ${1 - i * 0.3})`;
    ctx.fillText(line, pad, VIEW_HEIGHT - 12 - (world.feed.length - 1 - i) * 16);
  });

  // Controls hint, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('WASD move · Shift sneak · Click/Space pebble · R restart · M mute', VIEW_WIDTH - pad, VIEW_HEIGHT - 12);
}

/** Dim the whole scene for an overlay screen. */
function dimScene(ctx) {
  ctx.fillStyle = 'rgba(8, 5, 3, 0.62)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 9, 6, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawTitle(ctx) {
  dimScene(ctx);
  panel(ctx, 180, 110, 600, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('THE VELVET FOX', VIEW_WIDTH / 2, 175);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText('A night at the museum. One sapphire. Three guards.', VIEW_WIDTH / 2, 210);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  const lines = [
    'Slip past the patrols in their yellow vision cones.',
    'Hide behind pedestals, plants and statues to break their sight.',
    'Grab the STAR SAPPHIRE, then reach the green EXIT unseen.',
    'If the ALARM hits 100%, you are busted.',
    '',
    'WASD / arrows — move      Shift — sneak (slow, quiet, hard to spot)',
    'Click or Space — toss a pebble to distract a guard',
    'R — restart      M — mute sound',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, 245 + i * 24));
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press ENTER or click to begin', VIEW_WIDTH / 2, 455);
}

function drawEndScreen(ctx, world, won, scoreInfo) {
  dimScene(ctx);
  panel(ctx, 230, 150, 500, 330);
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('CLEAN GETAWAY!', VIEW_WIDTH / 2, 215);
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    ctx.fillText('The Velvet Fox slips into the night with the sapphire.', VIEW_WIDTH / 2, 248);
  } else {
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('BUSTED!', VIEW_WIDTH / 2, 215);
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    ctx.fillText('The alarm hit 100%. The guards close in…', VIEW_WIDTH / 2, 248);
  }
  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillText(`Loot ${world.lootTaken}/${world.lootTotal}   Time ${mins}:${String(secs).padStart(2, '0')}`, VIEW_WIDTH / 2, 285);
  ctx.fillText(`Time bonus +${scoreInfo.timeBonus}   Clean bonus +${scoreInfo.cleanBonus}`, VIEW_WIDTH / 2, 312);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`FINAL SCORE  ${scoreInfo.total}`, VIEW_WIDTH / 2, 350);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px sans-serif';
  ctx.fillText('Press R to play again', VIEW_WIDTH / 2, 400);
}

// ---------------------------------------------------------------- main draw

/** Draw one frame of the game for a given screen state. */
export function drawGame(ctx, world, screen, scoreInfo) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawFloor(ctx);
  drawExit(ctx, world.exit);
  for (const prop of COVER_PROPS) drawProp(ctx, prop);
  for (const item of world.loot) drawLoot(ctx, item, world.time);
  drawPebbles(ctx, world.pebbles);
  for (const guard of world.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, world.player);
  drawWalls(ctx);
  drawHud(ctx, world);
  if (screen === 'title') drawTitle(ctx);
  if (screen === 'win') drawEndScreen(ctx, world, true, scoreInfo);
  if (screen === 'caught') drawEndScreen(ctx, world, false, scoreInfo);
}
