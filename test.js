"use strict";

const assert = require("node:assert/strict");
const core = require("./game-core.js");

assert.equal(core.COLS, 9);
assert.equal(core.ROWS, 12);
assert.equal(core.SHAPES.length, 9);
assert.ok(core.SHAPES.some((piece) => piece.cells.flat().filter(Boolean).length === 5));

const grid = core.createGrid();
assert.equal(grid.length, 12);
assert.ok(grid.every((row) => row.length === 9 && row.every((cell) => cell === null)));

for (let y = 9; y < 12; y += 1) {
  for (let x = 0; x < 3; x += 1) grid[y][x] = 1;
}
assert.deepEqual(core.findFullZones(grid), [{ x: 0, y: 9 }]);
const oneZone = core.resolveZones(grid);
assert.deepEqual(oneZone, { chain: 1, totalZones: 1, points: 300 });
assert.equal(core.findFullZones(grid).length, 0);

const gravityGrid = core.createGrid();
gravityGrid[1][4] = 2;
gravityGrid[6][4] = 3;
core.applyGravity(gravityGrid);
assert.equal(gravityGrid[11][4], 3);
assert.equal(gravityGrid[10][4], 2);

const collisionGrid = core.createGrid();
const piece = core.makePiece(0);
piece.x = 0;
piece.y = 10;
assert.equal(core.collides(collisionGrid, piece, 0, 0), false);
assert.equal(core.collides(collisionGrid, piece, -1, 0), true);
piece.y = 11;
assert.equal(core.collides(collisionGrid, piece, 0, 1), true);

const turned = core.rotate([[1, 0], [1, 1], [0, 1]]);
assert.deepEqual(turned, [[0, 1, 1], [1, 1, 0]]);

console.log("Mozaikzápor core tests: PASS");
