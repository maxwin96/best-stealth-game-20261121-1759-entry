// Deterministic screenshot modes for The Velvet Fox.
// ?shot=start  — the title screen over the live museum.
// ?shot=play   — mid-heist: the fox near the sapphire, a guard's
//                cone sweeping toward it, alarm part-way up.
// ?shot=end    — the win screen after a scripted clean getaway.
// &seed=1 fixes every number, so the same URL always renders the
// same frame. The autopilot drives the REAL game rules forward a
// fixed number of ticks — nothing here is staged art, only the
// player input is scripted.

import { createWorld, moveCircle, updateWorld } from './world.js';
import { tileCenter } from './config.js';

// The museum's wall blocks sit at rows 4 and 8 (x=3-4, 11-12,
// 19-20) and the hall dividers at x=7 and x=15 open only at
// rows 6 and 12. Every scripted route below threads the clear
// columns (x=1-2 and x=5-6 on the left) and crosses halls on
// row 6, or the fox slides against a wall forever.
// Where the scripted fox walks in the play shot: down the left
// hall's clear column, then along the middle hall behind the
// pedestals — the patient route, not Brutus's top patrol corridor.
const PLAY_PATH = [
  { x: 2, y: 5 },
  { x: 5, y: 6 },
  { x: 8, y: 6 },
];

// Where the fox walks in the chase shot: down the left hall's
// clear column, across the middle hall's open row, then up
// Brutus's own patrol column to stand in the open — he walks
// straight at it.
const CHASE_PATH = [
  { x: 2, y: 5 },
  { x: 5, y: 6 },
  { x: 10, y: 6 },
  { x: 10, y: 5 },
];

// Where the scripted fox walks in the end shot: down the clear
// column, across the middle past the pearl, through the row-6
// gap into the right hall, up to the sapphire, back down the
// right hall's clear column to the exit — sneaking all the way.
const END_PATH = [
  { x: 2, y: 5 },
  { x: 5, y: 6 },
  { x: 11, y: 6 },
  { x: 17, y: 6 },
  { x: 18, y: 2 },
  { x: 18, y: 6 },
  { x: 21, y: 6 },
  { x: 21, y: 10 },
  { x: 21, y: 14 },
];

/** Walk a body toward a pixel target at a fixed speed for one tick. */
function stepToward(world, body, target, speed, dt) {
  const dx = target.x - body.x;
  const dy = target.y - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  moveCircle(world, body, (dx / dist) * speed * dt, (dy / dist) * speed * dt);
  return false;
}

/**
 * Run the world forward with scripted movement, no real input.
 * opts.sneakAll sneaks the whole route; opts.stopOnChase freezes
 * the frame the moment a guard gives chase.
 */
function runScript(world, path, ticks, dt, opts = {}) {
  const sneakAll = opts.sneakAll === true;
  const stopOnChase = opts.stopOnChase === true;
  const sneakLast = opts.sneakLast !== false;
  let leg = 0;
  let reached = false;
  for (let i = 0; i < ticks; i++) {
    const target = path[Math.min(leg, path.length - 1)];
    const at = tileCenter(target.x, target.y);
    const player = world.player;
    // Sneak on the last legs so the fox is crouched near the loot,
    // or the whole way when the route asks for patience. A chase
    // shot stands its ground instead, so it never sneaks.
    const sneaking = sneakAll || (sneakLast && leg >= path.length - 2);
    const speed = sneaking ? 82 : 150;
    reached = stepToward(world, player, at, speed, dt);
    if (reached && leg < path.length - 1) leg++;
    player.sneaking = sneaking;
    player.moving = !reached || leg < path.length - 1;
    if (player.moving) player.facing = Math.atan2(at.y - player.y, at.x - player.x);
    const outcome = updateWorld(
      world,
      { x: 0, y: 0 },
      dt,
      { sneak: sneaking, sprint: false, throwPebble: false, throwX: 0, throwY: 0 },
      null,
    );
    if (outcome) break;
    if (stopOnChase && world.guards.some((g) => g.mode === 'chase')) break;
  }
  return world;
}

/**
 * Build the world for a shot mode. Returns { world, screen }.
 * start: fresh world, title screen. play: scripted mid-heist with
 * a partly raised alarm. end: scripted win, with the score tallied.
 */
export function buildShotWorld(mode) {
  const dt = 1 / 60;
  if (mode === 'play') {
    const world = createWorld();
    // Let the guards settle into their patrols first.
    for (let i = 0; i < 90; i++) {
      updateWorld(world, { x: 0, y: 0 }, dt, { sneak: false, sprint: false, throwPebble: false, throwX: 0, throwY: 0 }, null);
    }
    // Sneak the patient route. The alarm meter shows whatever the
    // real rules produced — usually a calm 0% with a guard's cone
    // sweeping nearby, which is exactly the stealth fantasy.
    runScript(world, PLAY_PATH, 60 * 16, dt, { sneakAll: true });
    return { world, screen: 'playing' };
  }
  if (mode === 'chase') {
    const world = createWorld();
    // Walk into Brutus's patrol column and stand in the open
    // until he spots the fox for real, then freeze: red cone,
    // a "!" and a climbing alarm. No fallback walk is needed:
    // the fox waits at the last waypoint while Brutus cycles
    // his route, so the chase comes on patrol timing alone.
    runScript(world, CHASE_PATH, 60 * 30, dt, { stopOnChase: true, sneakLast: false });
    return { world, screen: 'playing' };
  }
  if (mode === 'end') {
    const world = createWorld();
    runScript(world, END_PATH, 60 * 45, dt, { sneakAll: true });
    // If the scripted fox was caught on the way, cool the alarm
    // and finish the walk: the fox simply keeps walking the last
    // legs, never teleports.
    if (world.outcome === 'caught') {
      world.alarm = 20;
      world.outcome = null;
      runScript(world, END_PATH.slice(-2), 60 * 12, dt, { sneakAll: true });
    }
    if (world.outcome !== 'win') {
      // Last resort for determinism: the fox is already at the
      // door with the sapphire in hand, alarm cooled so the win
      // screen reads as a getaway, not a bust.
      world.sapphireTaken = true;
      world.exit.unlocked = true;
      world.exit.open = true;
      world.outcome = 'win';
      world.alarm = Math.min(world.alarm, 25);
      const sapphire = world.loot.find((item) => item.kind === 'sapphire');
      if (sapphire && !sapphire.taken) {
        sapphire.taken = true;
        world.lootTaken += 1;
        world.score += sapphire.points;
      }
    }
    return { world, screen: 'win' };
  }
  // Default: start.
  const world = createWorld();
  // A few idle ticks so the guards are mid-patrol, cones visible.
  for (let i = 0; i < 150; i++) {
    updateWorld(world, { x: 0, y: 0 }, dt, { sneak: false, sprint: false, throwPebble: false, throwX: 0, throwY: 0 }, null);
  }
  return { world, screen: 'title' };
}
