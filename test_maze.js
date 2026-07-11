/**
 * QA tests for maze logic — run: node --test test_maze.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* ── inlined maze engine (mirror of index.html) ─────────────── */
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return {
    next() {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(this.next() * n); },
    choice(arr) { return arr[this.int(arr.length)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = this.int(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  };
}

function cellKey(r, c) { return r + ',' + c; }

function neighbors4(r, c, rows, cols) {
  const n = [];
  if (r > 0) n.push([r - 1, c]);
  if (r < rows - 1) n.push([r + 1, c]);
  if (c > 0) n.push([r, c - 1]);
  if (c < cols - 1) n.push([r, c + 1]);
  return n;
}

function findBranchFreePathSimple(rows, cols, startCol, goalCol, rng) {
  const path = [[0, startCol]];
  let c = startCol;
  const topVia = rng.int(2) === 0 ? goalCol : rng.int(cols);
  while (c !== topVia) {
    c += c < topVia ? 1 : -1;
    path.push([0, c]);
  }
  if (rows === 2) {
    while (c !== goalCol) {
      c += c < goalCol ? 1 : -1;
      path.push([0, c]);
    }
    path.push([rows - 1, goalCol]);
    return path;
  }
  for (let r = 1; r < rows - 1; r++) path.push([r, topVia]);
  c = topVia;
  const lastRow = rows - 2;
  while (c !== goalCol) {
    c += c < goalCol ? 1 : -1;
    path.push([lastRow, c]);
  }
  path.push([rows - 1, goalCol]);
  return path;
}

function wouldCreateBranch(path, cell) {
  for (let i = 0; i < path.length - 1; i++) {
    if (isOrthogonal(path[i], cell)) return true;
  }
  return false;
}

function straightRunLen(path) {
  if (path.length < 2) return 0;
  const dr = path[path.length - 1][0] - path[path.length - 2][0];
  const dc = path[path.length - 1][1] - path[path.length - 2][1];
  let len = 1;
  for (let i = path.length - 2; i >= 1; i--) {
    const dr2 = path[i][0] - path[i - 1][0];
    const dc2 = path[i][1] - path[i - 1][1];
    if (dr2 === dr && dc2 === dc) len++;
    else break;
  }
  return len;
}

function orderNeighborsForWindiness(path, neighbors, rng) {
  const [r, c] = path[path.length - 1];
  let pdr = 0;
  let pdc = 0;
  if (path.length >= 2) {
    pdr = r - path[path.length - 2][0];
    pdc = c - path[path.length - 2][1];
  }
  const preferTurn = straightRunLen(path) >= 2;
  const turns = [];
  const same = [];
  const other = [];
  for (const [nr, nc] of neighbors) {
    const dr = nr - r;
    const dc = nc - c;
    const isSame = dr === pdr && dc === pdc;
    const isTurn = (pdr !== 0 || pdc !== 0) && !isSame;
    if (preferTurn && isTurn) turns.push([nr, nc]);
    else if (isSame) same.push([nr, nc]);
    else other.push([nr, nc]);
  }
  return [...rng.shuffle(turns), ...rng.shuffle(other), ...rng.shuffle(same)];
}

function findBranchFreePathWindy(rows, cols, startCol, goalCol, rng) {
  const goal = [rows - 1, goalCol];
  const maxTotal = rows * cols * 2;

  function tryWalk() {
    const path = [[0, startCol]];
    const visited = new Set([cellKey(0, startCol)]);
    let dir = null;
    let stepsInDir = 0;
    let maxStepsInDir = 0;
    let steps = 0;

    while (steps++ < maxTotal) {
      const [r, c] = path[path.length - 1];
      if (r === goal[0] && c === goal[1] && path.length >= rows) return path;

      if (dir === null || stepsInDir >= maxStepsInDir) {
        maxStepsInDir = rng.int(3) + 2;
        stepsInDir = 0;
        dir = null;
      }

      let candidates = neighbors4(r, c, rows, cols).filter(([nr, nc]) => {
        if (visited.has(cellKey(nr, nc))) return false;
        if (wouldCreateBranch(path, [nr, nc])) return false;
        if (nr === rows - 1 && nc !== goalCol) return false;
        return true;
      });

      if (!candidates.length) {
        if (path.length <= 1) return null;
        const removed = path.pop();
        visited.delete(cellKey(...removed));
        dir = null;
        stepsInDir = 0;
        continue;
      }

      let pick;
      if (dir !== null) {
        const [dr, dc] = dir;
        const cont = candidates.find(([nr, nc]) => nr - r === dr && nc - c === dc);
        pick = cont && stepsInDir < maxStepsInDir
          ? cont
          : orderNeighborsForWindiness(path, candidates, rng)[0];
      } else {
        const ordered = orderNeighborsForWindiness(path, candidates, rng);
        pick = ordered[rng.int(Math.min(3, ordered.length))];
      }

      dir = [pick[0] - r, pick[1] - c];
      stepsInDir++;
      path.push(pick);
      visited.add(cellKey(...pick));
    }
    return null;
  }

  for (let i = 0; i < 80; i++) {
    const result = tryWalk();
    if (result) return result;
  }
  return null;
}

function findBranchFreePath(rows, cols, startCol, goalCol, rng) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const path = findBranchFreePathWindy(rows, cols, startCol, goalCol, rng);
    if (path && path.length >= rows) return path;
  }
  return findBranchFreePathSimple(rows, cols, startCol, goalCol, rng);
}

function dfsPath(rows, cols, rng) {
  const startCol = rng.int(cols);
  const goalCol = rng.int(cols);
  return findBranchFreePath(rows, cols, startCol, goalCol, rng);
}

function colorPair(light, dark) { return { light, dark }; }

function fillGridSingle(path, rows, cols, rng, trail, distractors) {
  const route = new Set(path.map(([r, c]) => cellKey(r, c)));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      route.has(cellKey(r, c))
        ? { ...trail, isTrail: true }
        : { ...rng.choice(distractors), isTrail: false }
    )
  );
}

function isAvoided(pair, avoid) {
  return pair.light.toLowerCase() === avoid.light.toLowerCase();
}

function fillGridAvoid(path, rows, cols, rng, trail, distractors, avoid) {
  const route = new Set(path.map(([r, c]) => cellKey(r, c)));
  const safeForPath = distractors.filter(d => !isAvoided(d, avoid));
  if (!safeForPath.some(d => d.light === trail.light)) safeForPath.push(trail);
  const allDistractors = [...distractors, avoid];
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      route.has(cellKey(r, c))
        ? { ...rng.choice(safeForPath), isTrail: true }
        : { ...rng.choice(allDistractors), isTrail: false }
    )
  );
}

function generatePuzzle(rows, cols, seed, ruleId, trail, distractors, avoid) {
  const fillRng = makeRng(seed);
  for (let i = 0; i < 100; i++) {
    const pathRng = makeRng((seed ^ Math.imul(i + 1, 0x9E3779B9)) >>> 0);
    const path = dfsPath(rows, cols, pathRng);
    if (!path) continue;
    const grid = ruleId === 'avoidColor'
      ? fillGridAvoid(path, rows, cols, fillRng, trail, distractors, avoid)
      : fillGridSingle(path, rows, cols, fillRng, trail, distractors);
    const puzzle = { grid, path, avoid };
    const err = validatePuzzle(puzzle, rows, cols, ruleId);
    if (!err) return puzzle;
  }
  return null;
}

function isOrthogonal(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function validatePuzzle(puzzle, rows, cols, ruleId) {
  const { path, grid } = puzzle;
  if (!path || path.length < rows) return 'short';
  if (path[0][0] !== 0) return 'start';
  if (path[path.length - 1][0] !== rows - 1) return 'end';
  const seen = new Set();
  for (const [r, c] of path) {
    const k = cellKey(r, c);
    if (seen.has(k)) return 'revisit';
    seen.add(k);
  }
  for (let i = 1; i < path.length; i++) {
    if (!isOrthogonal(path[i - 1], path[i])) return 'diagonal';
  }
  const index = new Map(path.map((cell, i) => [cellKey(...cell), i]));
  for (const a of path) {
    for (const b of path) {
      if (a === b) continue;
      if (isOrthogonal(a, b) && Math.abs(index.get(cellKey(...a)) - index.get(cellKey(...b))) !== 1) {
        return 'branch';
      }
    }
  }
  let bottomTrail = 0;
  for (let c = 0; c < cols; c++) {
    if (grid[rows - 1][c].isTrail) bottomTrail++;
  }
  if (bottomTrail !== 1) return 'bottom';
  if (ruleId === 'singleColor') {
    const route = new Set(path.map(([r, c]) => cellKey(r, c)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].isTrail !== route.has(cellKey(r, c))) return 'trail';
      }
    }
  }
  if (ruleId === 'avoidColor') {
    for (const [r, c] of path) {
      if (grid[r][c].light.toLowerCase() === puzzle.avoid.light.toLowerCase()) return 'avoided';
    }
  }
  return null;
}

const PALETTE = {
  geel:  { light: '#DDD4A0', dark: '#C8BE88', name: 'geel',  adj: 'gele' },
  groen: { light: '#C4D2B8', dark: '#A8B89E', name: 'groen', adj: 'groene' },
  roze:  { light: '#E8B4B8', dark: '#D4989E', name: 'roze',  adj: 'roze' },
  blauw: { light: '#B4C4CC', dark: '#9AADB6', name: 'blauw', adj: 'blauwe' }
};

function palettePair(key) {
  const p = PALETTE[key];
  return { light: p.light, dark: p.dark };
}

const TRAIL = palettePair('geel');
const DIST = ['groen', 'roze', 'blauw'].map(palettePair);
const AVOID = palettePair('roze');

const DIFFICULTIES = [
  { rows: 6, cols: 7 },
  { rows: 9, cols: 8 },
  { rows: 11, cols: 12 }
];

describe('maze generator', () => {
  it('seed 42 produces valid singleColor puzzle', () => {
    const p = generatePuzzle(9, 8, 42, 'singleColor', TRAIL, DIST, AVOID);
    assert.ok(p);
    assert.equal(validatePuzzle(p, 9, 8, 'singleColor'), null);
  });

  it('start column varies across seeds', () => {
    const starts = new Set();
    for (let s = 0; s < 50; s++) {
      const p = generatePuzzle(9, 8, s, 'singleColor', TRAIL, DIST, AVOID);
      assert.ok(p);
      starts.add(p.path[0][1]);
    }
    assert.ok(starts.size > 1);
  });

  for (const ruleId of ['singleColor', 'avoidColor']) {
    for (const { rows, cols } of DIFFICULTIES) {
      it(`${ruleId} ${rows}x${cols} — 200 seeds`, () => {
        for (let seed = 0; seed < 200; seed++) {
          const p = generatePuzzle(rows, cols, seed, ruleId, TRAIL, DIST, AVOID);
          assert.ok(p, `failed seed ${seed}`);
          assert.equal(validatePuzzle(p, rows, cols, ruleId), null, `seed ${seed}`);
        }
      });
    }
  }
});
