// The Velvet Fox — configuration and the museum level layout.
// Everything here is original: a night museum, a fox thief, three
// patrolling guards, pedestals and plants for cover, one Star Sapphire
// to steal and a green exit door to slip through unseen.

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 640;

export const TILE = 40;

// The museum floor is a grid of 24 by 16 tiles. '#' is a solid wall,
// '.' is open marble floor. The border is always wall.
export const MAP_ROWS = [
  '########################',
  '#......#.......#........#',
  '#..P...#...G...#....L...#',
  '#......#.......#........#',
  '#..##..#...##..#...##...#',
  '#......#.......#........#',
  '#..S.......P.......S....#',
  '#......#.......#........#',
  '#..##..#...##..#...##...#',
  '#......#.......#........#',
  '#..P...#...G...#....L...#',
  '#......#.......#........#',
  '#..S.......P.......S....#',
  '#......#.......#........#',
  '#..E...#.......#....X...#',
  '########################',
];

export const MAP_WIDTH = MAP_ROWS[0].length;
export const MAP_HEIGHT = MAP_ROWS.length;

// Player tuning.
export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 82;
export const PLAYER_SPRINT_SPEED = 205;

// Guard tuning.
export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 128;
export const GUARD_VIEW_DISTANCE = 235;
export const GUARD_VIEW_HALF_ANGLE = 0.62;
export const GUARD_HEAR_RADIUS = 120;

// Detection tuning. Suspicion is per guard, 0 to 100.
// Standing in a cone fills it fast; sneaking fills it slowly;
// hiding behind cover drains it. Full suspicion means a chase.
export const SUSPICION_GAIN_SEEN = 62;
export const SUSPICION_GAIN_SEEN_CLOSE = 95;
export const SUSPICION_GAIN_SNEAK = 22;
export const SUSPICION_DECAY = 26;
export const SUSPICION_CHASE_AT = 100;

// Alarm is global, 0 to 100. At 100 the fox is busted.
export const ALARM_GAIN_CHASE = 9;
export const ALARM_GAIN_CAUGHT_TOUCH = 34;
export const ALARM_GAIN_SPOTTED_BURST = 12;
export const ALARM_DECAY = 3.2;
export const ALARM_MAX = 100;

// Loot values. The Star Sapphire is the mission target;
// the small gems are optional and raise the score.
export const LOOT = {
  sapphire: { points: 500, label: 'Star Sapphire' },
  ruby: { points: 150, label: 'Ruby' },
  emerald: { points: 150, label: 'Emerald' },
  pearl: { points: 100, label: 'Pearl' },
  coin: { points: 50, label: 'Gold coin' },
};

// Guard patrol routes, as tile waypoints. Each guard walks its
// route back and forth, pausing a beat at every corner to look around.
export const GUARD_ROUTES = [
  {
    name: 'Brutus',
    color: '#e74c3c',
    waypoints: [
      { x: 5, y: 2 },
      { x: 10, y: 2 },
      { x: 10, y: 7 },
      { x: 5, y: 7 },
    ],
  },
  {
    name: 'Mabel',
    color: '#8e44ad',
    waypoints: [
      { x: 14, y: 3 },
      { x: 20, y: 3 },
      { x: 20, y: 10 },
      { x: 14, y: 10 },
    ],
  },
  {
    name: 'Otto',
    color: '#2471a3',
    waypoints: [
      { x: 9, y: 11 },
      { x: 9, y: 13 },
      { x: 17, y: 13 },
      { x: 17, y: 11 },
    ],
  },
];

// Where the loot sits, in tile coordinates.
export const LOOT_SPOTS = [
  { kind: 'sapphire', x: 18, y: 2 },
  { kind: 'ruby', x: 4, y: 10 },
  { kind: 'emerald', x: 18, y: 10 },
  { kind: 'pearl', x: 11, y: 6 },
  { kind: 'coin', x: 4, y: 6 },
  { kind: 'coin', x: 13, y: 13 },
];

// Player start tile and the exit door tile.
export const PLAYER_START = { x: 3, y: 2 };
export const EXIT_TILE = { x: 21, y: 14 };

// Cover props placed on the floor. They block line of sight and
// movement, so the fox can slip behind them. Kinds: pedestal,
// plant, statue, bench. None of them sits on a guard's patrol
// line: a prop in a patrol column would block the guard's own
// sight and the guard would walk straight through it.
export const COVER_PROPS = [
  { kind: 'pedestal', x: 7, y: 4 },
  { kind: 'plant', x: 12, y: 4 },
  { kind: 'statue', x: 17, y: 5 },
  { kind: 'pedestal', x: 7, y: 9 },
  { kind: 'plant', x: 12, y: 9 },
  { kind: 'statue', x: 18, y: 13 },
  { kind: 'bench', x: 9, y: 4 },
  { kind: 'bench', x: 13, y: 9 },
];

// How long a thrown pebble distracts a guard, in seconds,
// and how far its clatter carries.
export const PEBBLE_DISTRACT_SECONDS = 3.5;
export const PEBBLE_HEAR_RADIUS = 260;

// Score bonuses.
export const WIN_TIME_BONUS_PER_SECOND = 8;
export const WIN_CLEAN_BONUS = 300;
export const PAR_TIME_SECONDS = 180;

/** Convert a tile coordinate to the pixel centre of that tile. */
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** True when the tile at (tx, ty) is a wall, including outside the map. */
export function isWallTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) return true;
  return MAP_ROWS[ty][tx] === '#';
}
