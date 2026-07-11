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

function dfsPath(rows, cols, rng) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const startCol = rng.int(cols);
    const goalCol = rng.int(cols);
    const startK = cellKey(0, startCol);
    const goalK = cellKey(rows - 1, goalCol);
    const stack = [[0, startCol]];
    const parent = new Map([[startK, null]]);
    const visited = new Set([startK]);

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      if (cellKey(r, c) === goalK) {
        const path = [];
        let cur = cellKey(r, c);
        while (cur) {
          const [rr, cc] = cur.split(',').map(Number);
          path.unshift([rr, cc]);
          cur = parent.get(cur);
        }
        return path;
      }
      const nbrs = rng.shuffle(neighbors4(r, c, rows, cols));
      let extended = false;
      for (const [nr, nc] of nbrs) {
        const nk = cellKey(nr, nc);
        if (!visited.has(nk)) {
          visited.add(nk);
          parent.set(nk, cellKey(r, c));
          stack.push([nr, nc]);
          extended = true;
          break;
        }
      }
      if (!extended) stack.pop();
    }
  }
  return null;
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
  const rng = makeRng(seed);
  for (let i = 0; i < 100; i++) {
    const path = dfsPath(rows, cols, rng);
    if (!path) continue;
    const grid = ruleId === 'avoidColor'
      ? fillGridAvoid(path, rows, cols, rng, trail, distractors, avoid)
      : fillGridSingle(path, rows, cols, rng, trail, distractors);
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

const TRAIL = colorPair('#DDD4A0', '#C8BE88');
const DIST = [
  colorPair('#C4D2B8', '#A8B89E'),
  colorPair('#D4C0B4', '#BFA898'),
  colorPair('#B4C4CC', '#9AADB6')
];
const AVOID = colorPair('#E8B4B8', '#D4989E');

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
