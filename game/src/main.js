// The Velvet Fox — entry point: game loop, screen state machine,
// input wiring and the deterministic ?shot= modes used for the
// screenshots. The rules live in world.js; this file only runs them.

import { VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { createAudio, ensureAudio, playAlert, playCaught, playPebble, playPickup, playStep, playUnlock, playWin, toggleMute } from './audio.js';
import { createInput, endFrame, isDown, moveVector, wasPressed } from './input.js';
import { drawGame } from './render.js';
import { buildShotWorld } from './shots.js';
import { createWorld, finalScore, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const input = createInput(canvas);
const audio = createAudio();

// Sounds the world can trigger, wired to the synth functions.
const sounds = {
  alert: () => playAlert(audio),
  caught: () => playCaught(audio),
  pickup: () => playPickup(audio),
  pebble: () => playPebble(audio),
  unlock: () => playUnlock(audio),
};

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot');
const seed = Number(params.get('seed') || '1');

// Screen: 'title' | 'playing' | 'win' | 'caught'.
let screen = 'title';
let world = createWorld();
let scoreInfo = { total: 0, timeBonus: 0, cleanBonus: 0 };
let lastTime = performance.now();

if (shotMode) {
  // Screenshot mode: build the deterministic frame at once and
  // draw it once — no loop, no input, the same seed every time.
  const shot = buildShotWorld(shotMode);
  world = shot.world;
  screen = shot.screen;
  scoreInfo = finalScore(world);
  // No sound in shot mode: there is no user gesture yet, so the
  // browser would block audio anyway.
  drawGame(ctx, world, screen, scoreInfo);
  document.title = `The Velvet Fox — shot ${shotMode} (seed ${seed})`;
} else {
  requestAnimationFrame(frame);
}

/** Start a fresh run from the title screen. */
function startGame() {
  world = createWorld();
  scoreInfo = { total: 0, timeBonus: 0, cleanBonus: 0 };
  screen = 'playing';
  ensureAudio(audio);
}

/** Restart after a win or a bust. */
function restart() {
  startGame();
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Global keys work on every screen.
  if (wasPressed(input, 'm') || wasPressed(input, 'M')) {
    ensureAudio(audio);
    toggleMute(audio);
  }
  if (wasPressed(input, 'r') || wasPressed(input, 'R')) {
    if (screen !== 'title') restart();
  }

  if (screen === 'title') {
    if (wasPressed(input, 'Enter') || input.mouseClicked) {
      startGame();
    }
    // Idle guards patrol behind the title panel.
    updateWorld(world, { x: 0, y: 0 }, dt, { sneak: false, sprint: false, throwPebble: false, throwX: 0, throwY: 0 }, null);
  } else if (screen === 'playing') {
    ensureAudio(audio);
    const vec = moveVector(input);
    const actions = {
      sneak: isDown(input, 'Shift'),
      // No sprint key in this game: running loud is never worth it
      // when one guard's glance can end the run.
      sprint: false,
      throwPebble: false,
      throwX: input.mouseX,
      throwY: input.mouseY,
    };
    // Space or a click tosses a pebble toward the mouse.
    if (wasPressed(input, ' ') || input.mouseClicked) {
      actions.throwPebble = true;
    }
    const outcome = updateWorld(world, vec, dt, actions, sounds);
    // Footsteps: a soft tick every few pixels walked, quieter sneaking.
    if (world.player.moving && world.player.stepAcc > 26) {
      world.player.stepAcc = 0;
      playStep(audio, world.player.sneaking);
    }
    if (outcome === 'win') {
      screen = 'win';
      scoreInfo = finalScore(world);
      playWin(audio);
    } else if (outcome === 'caught') {
      screen = 'caught';
      scoreInfo = finalScore(world);
      playCaught(audio);
    }
  } else {
    // Win / caught: R restarts (handled above); Enter also restarts.
    if (wasPressed(input, 'Enter')) restart();
  }

  drawGame(ctx, world, screen, scoreInfo);
  endFrame(input);
  requestAnimationFrame(frame);
}
