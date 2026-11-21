// Keyboard and mouse input for The Velvet Fox.
// Movement: WASD or arrow keys. Shift: sneak (slow, quiet, harder
// to spot). Space: grab nearby loot is automatic, so Space throws
// a pebble instead. Click: also throws a pebble toward the mouse.
// R restarts, M mutes, Enter starts from the title screen.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseClicked: false,
    clickX: 0,
    clickY: 0,
    // A one-frame pulse set by keydown, consumed by the game loop.
    pressed: new Set(),
  };

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function onKeyDown(event) {
    const name = keyName(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(name)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      state.pressed.add(name);
    }
    keys.add(name);
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    state.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  }

  function onMouseDown(event) {
    onMouseMove(event);
    state.mouseClicked = true;
    state.clickX = state.mouseX;
    state.clickY = state.mouseY;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return state;
}

/** True while any of the given keys is held down. */
export function isDown(input, ...names) {
  for (const name of names) {
    if (input.keys.has(name)) return true;
  }
  return false;
}

/** True only on the frame the key was pressed; the caller clears it. */
export function wasPressed(input, name) {
  return input.pressed.has(name);
}

/** The movement vector from the held keys, normalized. */
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (isDown(input, 'a', 'ArrowLeft')) x -= 1;
  if (isDown(input, 'd', 'ArrowRight')) x += 1;
  if (isDown(input, 'w', 'ArrowUp')) y -= 1;
  if (isDown(input, 's', 'ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const len = Math.hypot(x, y);
    x /= len;
    y /= len;
  }
  return { x, y };
}

/** Clear the per-frame pulses at the end of a game tick. */
export function endFrame(input) {
  input.pressed.clear();
  input.mouseClicked = false;
}
