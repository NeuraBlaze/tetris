(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MosaicCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COLS = 9;
  const ROWS = 12;
  const ZONE = 3;

  const SHAPES = [
    { id: "spark", cells: [[1, 1]] },
    { id: "drop", cells: [[1], [1], [1]] },
    { id: "corner", cells: [[1, 0], [1, 1]] },
    { id: "step", cells: [[1, 1, 0], [0, 1, 1]] },
    { id: "hook", cells: [[1, 0], [1, 0], [1, 1]] },
    { id: "fork", cells: [[1, 1, 1], [1, 0, 1]] },
    { id: "zig", cells: [[1, 1], [0, 1], [0, 1]] },
    { id: "gem", cells: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },
    { id: "tile", cells: [[1, 1], [1, 1]] }
  ];

  function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function cloneShape(shape) {
    return shape.map((row) => row.slice());
  }

  function rotate(shape) {
    return shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
  }

  function makePiece(shapeIndex, random = Math.random) {
    const source = SHAPES[shapeIndex == null ? Math.floor(random() * SHAPES.length) : shapeIndex];
    const shape = cloneShape(source.cells);
    return { id: source.id, shape, x: Math.floor((COLS - shape[0].length) / 2), y: -1 };
  }

  function collides(grid, piece, dx = 0, dy = 0, shape = piece.shape) {
    return shape.some((row, y) => row.some((cell, x) => {
      if (!cell) return false;
      const boardX = piece.x + x + dx;
      const boardY = piece.y + y + dy;
      return boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && grid[boardY][boardX] !== null);
    }));
  }

  function lock(grid, piece, colorIndex) {
    let aboveTop = false;
    piece.shape.forEach((row, y) => row.forEach((cell, x) => {
      if (!cell) return;
      const boardY = piece.y + y;
      if (boardY < 0) aboveTop = true;
      else grid[boardY][piece.x + x] = colorIndex;
    }));
    return aboveTop;
  }

  function findFullZones(grid) {
    const zones = [];
    for (let zoneY = 0; zoneY < ROWS; zoneY += ZONE) {
      for (let zoneX = 0; zoneX < COLS; zoneX += ZONE) {
        let full = true;
        for (let y = zoneY; y < zoneY + ZONE && full; y += 1) {
          for (let x = zoneX; x < zoneX + ZONE; x += 1) {
            if (grid[y][x] === null) { full = false; break; }
          }
        }
        if (full) zones.push({ x: zoneX, y: zoneY });
      }
    }
    return zones;
  }

  function clearZones(grid, zones) {
    zones.forEach((zone) => {
      for (let y = zone.y; y < zone.y + ZONE; y += 1) {
        for (let x = zone.x; x < zone.x + ZONE; x += 1) grid[y][x] = null;
      }
    });
  }

  function applyGravity(grid) {
    for (let x = 0; x < COLS; x += 1) {
      const cells = [];
      for (let y = ROWS - 1; y >= 0; y -= 1) if (grid[y][x] !== null) cells.push(grid[y][x]);
      for (let y = ROWS - 1; y >= 0; y -= 1) grid[y][x] = cells[ROWS - 1 - y] ?? null;
    }
  }

  function resolveZones(grid) {
    let chain = 0;
    let totalZones = 0;
    let points = 0;
    while (true) {
      const zones = findFullZones(grid);
      if (!zones.length) break;
      chain += 1;
      totalZones += zones.length;
      points += zones.length * 300 * chain;
      clearZones(grid, zones);
      applyGravity(grid);
    }
    return { chain, totalZones, points };
  }

  return { COLS, ROWS, ZONE, SHAPES, createGrid, rotate, makePiece, collides, lock, findFullZones, clearZones, applyGravity, resolveZones };
});
