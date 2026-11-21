// The Velvet Fox — world state, guard patrols, vision cones,
// line of sight, suspicion, alarm, loot and the exit door.
// All rules live here; render.js only draws what this file decides.

import {
  ALARM_DECAY,
  ALARM_GAIN_CAUGHT_TOUCH,
  ALARM_GAIN_CHASE,
  ALARM_GAIN_SPOTTED_BURST,
  ALARM_MAX,
  COVER_PROPS,
  EXIT_TILE,
  GUARD_CHASE_SPEED,
  GUARD_HEAR_RADIUS,
  GUARD_PATROL_SPEED,
  GUARD_ROUTES,
  GUARD_VIEW_DISTANCE,
  GUARD_VIEW_HALF_ANGLE,
  isWallTile,
  LOOT,
  LOOT_SPOTS,
  PEBBLE_DISTRACT_SECONDS,
  PEBBLE_HEAR_RADIUS,
  PLAYER_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_START,
  PLAYER_WALK_SPEED,
  SUSPICION_CHASE_AT,
  SUSPICION_DECAY,
  SUSPICION_GAIN_SEEN,
  SUSPICION_GAIN_SEEN_CLOSE,
  SUSPICION_GAIN_SNEAK,
  TILE,
  tileCenter,
} from './config.js';

/** Build a fresh world: player, guards, loot, exit and meters. */
export function createWorld() {
  const start = tileCenter(PLAYER_START.x, PLAYER_START.y);
  const exit = tileCenter(EXIT_TILE.x, EXIT_TILE.y);
  const world = {
    time: 0,
    player: {
      x: start.x,
      y: start.y,
      radius: PLAYER_RADIUS,
      sneaking: false,
      sprinting: false,
      moving: false,
      // Distance walked since the last footstep sound.
      stepAcc: 0,
      facing: 0,
    },
    guards: GUARD_ROUTES.map((route) => {
      const first = tileCenter(route.waypoints[0].x, route.waypoints[0].y);
      return {
        name: route.name,
        color: route.color,
        x: first.x,
        y: first.y,
        radius: 14,
        facing: 0,
        waypoints: route.waypoints.map((w) => tileCenter(w.x, w.y)),
        waypointIndex: 1,
        // How long to stand and look around at a waypoint.
        pauseLeft: 0,
        suspicion: 0,
        mode: 'patrol',
        // Where a distracted guard walks to investigate.
        investigate: null,
        investigateLeft: 0,
        // Where a chasing guard last saw the fox.
        lastSeen: null,
        // A short memory so a chase does not end the instant
        // the fox ducks behind a pedestal.
        memoryLeft: 0,
      };
    }),
    loot: LOOT_SPOTS.map((spot) => {
      const at = tileCenter(spot.x, spot.y);
      return {
        kind: spot.kind,
        x: at.x,
        y: at.y,
        taken: false,
        points: LOOT[spot.kind].points,
        label: LOOT[spot.kind].label,
        bob: Math.random() * Math.PI * 2,
      };
    }),
    exit: { x: exit.x, y: exit.y, unlocked: false, open: false },
    pebbles: [],
    alarm: 0,
    score: 0,
    lootTaken: 0,
    lootTotal: LOOT_SPOTS.length,
    sapphireTaken: false,
    // A one-line feed of recent events for the HUD ticker.
    feed: [],
    // Set when the run ends: 'win' or 'caught'.
    outcome: null,
    // True once a guard has ever fully spotted the fox.
    everSpotted: false,
  };
  return world;
}

/** Push a short event line onto the HUD feed (newest first, max 3). */
export function pushFeed(world, text) {
  world.feed.unshift(text);
  if (world.feed.length > 3) world.feed.length = 3;
}

// ---------------------------------------------------------------- geometry

/** True when the pixel point (x, y) sits inside a wall tile or a cover prop. */
export function isSolidAt(world, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (isWallTile(tx, ty)) return true;
  for (const prop of COVER_PROPS) {
    const at = tileCenter(prop.x, prop.y);
    const half = TILE / 2 - 2;
    if (Math.abs(x - at.x) < half && Math.abs(y - at.y) < half) return true;
  }
  return false;
}

/** Can a circle of `radius` centred at (x, y) stand there? */
export function canStand(world, x, y, radius) {
  const probes = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
    [x, y - radius],
    [x, y + radius],
    [x - radius, y],
    [x + radius, y],
  ];
  for (const [px, py] of probes) {
    if (isSolidAt(world, px, py)) return false;
  }
  return true;
}

/** Move a circle, sliding along walls: try x then y separately. */
export function moveCircle(world, body, dx, dy) {
  if (dx !== 0 && canStand(world, body.x + dx, body.y, body.radius)) {
    body.x += dx;
  }
  if (dy !== 0 && canStand(world, body.x, body.y + dy, body.radius)) {
    body.y += dy;
  }
}

/** Line of sight between two points: no wall and no cover prop crosses it. */
export function hasLineOfSight(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  // Step along the ray in small hops; a hop landing in solid ground
  // means the view is blocked.
  const steps = Math.ceil(dist / 6);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidAt(null, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

/** Shortest angle difference, wrapped to [-PI, PI]. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Can this guard see the player right now? */
export function guardSeesPlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_DISTANCE) return false;
  const toPlayer = Math.atan2(dy, dx);
  const off = Math.abs(angleDiff(toPlayer, guard.facing));
  if (off > GUARD_VIEW_HALF_ANGLE) return false;
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y)) return false;
  return true;
}

// ---------------------------------------------------------------- player

/** Move the player from input; returns true when a pebble was thrown. */
export function updatePlayer(world, vec, dt, actions) {
  const player = world.player;
  const sneak = actions.sneak;
  const sprint = actions.sprint && !sneak;
  const speed = sneak
    ? PLAYER_SNEAK_SPEED
    : sprint
      ? PLAYER_SPRINT_SPEED
      : PLAYER_WALK_SPEED;
  player.sneaking = sneak;
  player.sprinting = sprint;
  player.moving = vec.x !== 0 || vec.y !== 0;
  if (player.moving) {
    player.facing = Math.atan2(vec.y, vec.x);
    moveCircle(world, player, vec.x * speed * dt, vec.y * speed * dt);
    player.stepAcc += speed * dt;
  }
  // Pebble throw: a click or Space tosses one toward the mouse
  // or ahead of the fox; it clatters and pulls a guard over.
  if (actions.throwPebble) {
    throwPebble(world, actions.throwX, actions.throwY);
    return true;
  }
  return false;
}

function throwPebble(world, targetX, targetY) {
  const player = world.player;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy) || 1;
  const reach = Math.min(dist, 190);
  const landX = player.x + (dx / dist) * reach;
  const landY = player.y + (dy / dist) * reach;
  world.pebbles.push({
    x: landX,
    y: landY,
    age: 0,
    life: PEBBLE_DISTRACT_SECONDS + 1.2,
    heard: false,
  });
  pushFeed(world, 'Pebble tossed — listen for it…');
}

// ---------------------------------------------------------------- guards

function guardNextWaypoint(guard) {
  guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
}

function updateGuardPatrol(guard, dt) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    // Look around slowly while paused at a corner.
    guard.facing += dt * 0.9;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    guardNextWaypoint(guard);
    guard.pauseLeft = 0.8;
    return;
  }
  guard.facing = Math.atan2(dy, dx);
  const step = GUARD_PATROL_SPEED * dt;
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
}

function updateGuardChase(world, guard, dt) {
  const player = world.player;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1) {
    guard.facing = Math.atan2(dy, dx);
    const step = GUARD_CHASE_SPEED * dt;
    // Chase movement also slides along walls.
    moveCircle(world, guard, (dx / dist) * step, (dy / dist) * step);
  }
  // The guard remembers where it last saw the fox; losing sight
  // for a while drops the chase back to a patrol.
  if (guardSeesPlayer(guard, player)) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.memoryLeft = 2.5;
  } else {
    guard.memoryLeft -= dt;
    if (guard.memoryLeft <= 0) {
      guard.mode = 'patrol';
      guard.suspicion = 55;
      guard.lastSeen = null;
      pushFeed(world, `${guard.name} lost the trail…`);
    }
  }
}

function updateGuardInvestigate(world, guard, dt) {
  const target = guard.investigate;
  if (!target) {
    guard.mode = 'patrol';
    return;
  }
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) {
    guard.investigateLeft -= dt;
    guard.facing += dt * 1.4;
    if (guard.investigateLeft <= 0) {
      guard.investigate = null;
      guard.mode = 'patrol';
      guard.suspicion = Math.max(guard.suspicion, 25);
    }
    return;
  }
  guard.facing = Math.atan2(dy, dx);
  const step = GUARD_PATROL_SPEED * 1.25 * dt;
  moveCircle(world, guard, (dx / dist) * step, (dy / dist) * step);
}

/** One guard tick: sight, suspicion, mode changes, movement. */
export function updateGuard(world, guard, dt, sounds) {
  const player = world.player;
  const seen = guardSeesPlayer(guard, player);
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);

  if (seen && guard.mode !== 'chase') {
    // Closer and standing still fills suspicion much faster;
    // sneaking in the open still fills it, only slower.
    let gain = SUSPICION_GAIN_SEEN;
    if (dist < 110) gain = SUSPICION_GAIN_SEEN_CLOSE;
    if (player.sneaking) gain = SUSPICION_GAIN_SNEAK;
    if (player.sprinting) gain *= 1.35;
    guard.suspicion += gain * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= SUSPICION_CHASE_AT) {
      guard.suspicion = SUSPICION_CHASE_AT;
      guard.mode = 'chase';
      guard.memoryLeft = 2.5;
      world.everSpotted = true;
      world.alarm = Math.min(ALARM_MAX, world.alarm + ALARM_GAIN_SPOTTED_BURST);
      pushFeed(world, `${guard.name} spotted the fox!`);
      if (sounds) sounds.alert();
    }
  } else if (!seen && guard.mode !== 'chase') {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
  }

  // A chasing guard keeps the alarm climbing while the fox is near.
  if (guard.mode === 'chase') {
    world.alarm = Math.min(ALARM_MAX, world.alarm + ALARM_GAIN_CHASE * dt);
    updateGuardChase(world, guard, dt);
  } else if (guard.mode === 'investigate') {
    updateGuardInvestigate(world, guard, dt);
  } else {
    updateGuardPatrol(guard, dt);
  }

  // Touching a guard is a disaster: a big alarm jump.
  const touch = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (touch < player.radius + guard.radius + 2) {
    world.alarm = Math.min(ALARM_MAX, world.alarm + ALARM_GAIN_CAUGHT_TOUCH);
    pushFeed(world, `${guard.name} grabbed the fox!`);
    if (sounds) sounds.caught();
    // Shove the fox away so one touch is not an instant loop.
    // The shove slides along walls like any other movement, so
    // the fox can never be pushed inside a wall or off the floor.
    const away = Math.atan2(player.y - guard.y, player.x - guard.x);
    moveCircle(world, player, Math.cos(away) * 26, Math.sin(away) * 26);
  }
}

// ---------------------------------------------------------------- loot, exit, alarm

function updateLoot(world, sounds) {
  const player = world.player;
  for (const item of world.loot) {
    if (item.taken) continue;
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist < player.radius + 16) {
      item.taken = true;
      world.lootTaken += 1;
      world.score += item.points;
      if (item.kind === 'sapphire') {
        world.sapphireTaken = true;
        world.exit.unlocked = true;
        pushFeed(world, 'Star Sapphire pocketed — the exit is open!');
        if (sounds) sounds.unlock();
      } else {
        pushFeed(world, `${item.label} pocketed (+${item.points})`);
      }
      if (sounds) sounds.pickup();
    }
  }
}

function updatePebbles(world, dt, sounds) {
  for (const pebble of world.pebbles) {
    pebble.age += dt;
    if (!pebble.heard && pebble.age > 0.25) {
      pebble.heard = true;
      if (sounds) sounds.pebble();
      // The nearest patrolling guard goes to listen.
      let best = null;
      let bestDist = PEBBLE_HEAR_RADIUS;
      for (const guard of world.guards) {
        if (guard.mode !== 'patrol') continue;
        const d = Math.hypot(guard.x - pebble.x, guard.y - pebble.y);
        if (d < bestDist) {
          bestDist = d;
          best = guard;
        }
      }
      if (best) {
        best.mode = 'investigate';
        best.investigate = { x: pebble.x, y: pebble.y };
        best.investigateLeft = 2.2;
        pushFeed(world, `${best.name} heard something…`);
      }
    }
  }
  world.pebbles = world.pebbles.filter((p) => p.age < p.life);
}

function updateExit(world) {
  if (!world.exit.unlocked) return;
  const player = world.player;
  const dist = Math.hypot(player.x - world.exit.x, player.y - world.exit.y);
  if (dist < player.radius + 20) {
    world.exit.open = true;
    world.outcome = 'win';
  }
}

/** Advance the whole world one tick. `sounds` may be null (silent). */
export function updateWorld(world, vec, dt, actions, sounds) {
  world.time += dt;
  updatePlayer(world, vec, dt, actions);
  for (const guard of world.guards) {
    updateGuard(world, guard, dt, sounds);
  }
  updateLoot(world, sounds);
  updatePebbles(world, dt, sounds);
  updateExit(world);

  // The alarm cools down slowly when nobody is chasing.
  const chasing = world.guards.some((g) => g.mode === 'chase');
  if (!chasing && world.alarm > 0) {
    world.alarm = Math.max(0, world.alarm - ALARM_DECAY * dt);
  }
  if (world.alarm >= ALARM_MAX) {
    world.outcome = 'caught';
  }
  return world.outcome;
}

/** Final score: loot points plus a time bonus and a clean bonus. */
export function finalScore(world) {
  let total = world.score;
  const timeBonus = Math.max(0, Math.round((180 - world.time) * 8));
  total += timeBonus;
  if (!world.everSpotted) total += 300;
  return { total, timeBonus, cleanBonus: world.everSpotted ? 0 : 300 };
}
